import { expect, test, type Page } from '@playwright/test'

interface TestNftEvent {
  id: string
  resource: 'nft'
  resourceId: string
  version: number
  occurredAt: string
  payload: {
    nftId: string
    editionId?: string
    priceEth?: string
    availableQuantity?: number
    priceFromEth?: string
  }
}

interface TestOrderEvent {
  id: string
  resource: 'order'
  resourceId: string
  version: number
  occurredAt: string
  payload: { orderId: string; status: 'pending' | 'confirmed' | 'refused' }
}

declare const window: {
  __mocks__?: {
    simulateNftUpdate: (input: {
      nftId: string
      editionId?: string
      priceEth?: string
      availableQuantity?: number
    }) => Promise<TestNftEvent>
    simulateOrderUpdate: (input: { orderId: string; status: 'confirmed' | 'refused' }) => Promise<TestOrderEvent | null>
    replayNftEvent: (event: TestNftEvent) => void
    replayOrderEvent: (event: TestOrderEvent) => void
    connectedSocketCount: () => number
    disconnectSocketClients: () => void
    setScenario: (patch: { paymentOutcome: 'pending-forever' }) => unknown
  }
}

const ANA_EMAIL = 'ana@example.com'
const ANA_PASSWORD = 'Colecionar123!'

async function loginAsAna(page: Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill(ANA_EMAIL)
  await page.locator('#login-password').fill(ANA_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('a real nft.updated event refreshes cart totals and requires quote review', async ({ page }) => {
  await loginAsAna(page)
  await page.goto('/checkout')
  await expect(page.getByText('1.6721 ETH', { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)
  await page.getByRole('button', { name: 'Revisar e aceitar cotação atual' }).click()
  await expect(page.getByText(/Você revisou a cotação/)).toBeVisible()

  const updatedEvent = await page.evaluate(async () => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    return mocks.simulateNftUpdate({
      nftId: 'nft-music-1',
      editionId: 'nft-music-1-edition-1',
      priceEth: '0.777',
    })
  }) as TestNftEvent

  await expect(page.getByText('2.5061 ETH', { exact: true })).toBeVisible()
  await expect(page.getByText(/mudou\. Revise e aceite a cotação atualizada/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar e aceitar cotação atual' })).toBeEnabled()

  await page.evaluate((event) => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    mocks.replayNftEvent(event)
    mocks.replayNftEvent({
      ...event,
      id: `${event.id}-older`,
      version: event.version - 1,
      payload: { ...event.payload, priceEth: '0.001', priceFromEth: '0.001' },
    })
  }, updatedEvent)
  await expect(page.getByText('2.5061 ETH', { exact: true })).toBeVisible()

  await page.evaluate(async () => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    await mocks.simulateNftUpdate({
      nftId: 'nft-music-1',
      editionId: 'nft-music-1-edition-1',
      availableQuantity: 0,
    })
  })
  await expect(page.getByText(/Ajuste ou remova os itens indisponíveis/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar e aceitar cotação atual' })).toBeDisabled()
})

test('active cart and order queries reconcile through REST after socket reconnection', async ({ page }) => {
  const orderRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/orders/')) orderRequests.push(request.url())
  })
  await loginAsAna(page)
  await page.goto('/checkout')
  await expect(page.getByText('1.6721 ETH', { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)

  const order = await page.evaluate(async () => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    await mocks.setScenario({ paymentOutcome: 'pending-forever' })
    const cart = (await fetch('/api/cart').then((response) => response.json())) as { id: string }
    const quote = (await fetch(`/api/carts/${cart.id}/quote`).then((response) => response.json())) as { quoteVersion: number }
    const wallets = (await fetch('/api/wallets').then((response) => response.json())) as {
      items: { id: string; network: string }[]
    }
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        cartId: cart.id,
        quoteVersion: quote.quoteVersion,
        walletId: wallets.items[0].id,
        network: wallets.items[0].network,
      }),
    })
    if (!response.ok) throw new Error(`Não foi possível criar pedido de teste: ${response.status}`)
    return response.json()
  }) as { id: string }

  await page.goto(`/orders/${order.id}`)
  await expect(page.getByRole('status')).toContainText('Pendente')
  const initialOrderRequestCount = orderRequests.length

  await page.evaluate(() => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    mocks.disconnectSocketClients()
  })
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(0)
  await page.evaluate(async () => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    await mocks.simulateNftUpdate({
      nftId: 'nft-music-1',
      editionId: 'nft-music-1-edition-1',
      priceEth: '0.888',
    })
  })
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)
  await expect.poll(() => orderRequests.length).toBeGreaterThan(initialOrderRequestCount)
  await expect(page.getByRole('status')).toContainText('Pendente')

  const updatedOrderEvent = await page.evaluate(async (orderId) => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    return mocks.simulateOrderUpdate({ orderId, status: 'refused' })
  }, order.id) as TestOrderEvent
  await expect(page.getByRole('status')).toContainText('Recusado')
  await expect(page.getByText(`versão ${updatedOrderEvent.version}`)).toBeVisible()

  await page.evaluate((event) => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    mocks.replayOrderEvent(event)
    mocks.replayOrderEvent({
      ...event,
      id: `${event.id}-older`,
      version: event.version - 1,
      payload: { ...event.payload, status: 'confirmed' },
    })
  }, updatedOrderEvent)
  await expect(page.getByRole('status')).toContainText('Recusado')

  await page.goto('/checkout')
  await expect(page.getByText('2.7281 ETH', { exact: true })).toBeVisible()
})
