import { expect, test, type Page } from '@playwright/test'

declare const window: {
  __mocks__?: {
    simulateOrderUpdate: (input: { orderId: string; status: 'confirmed' | 'refused' }) => Promise<{
      version: number
    } | null>
    connectedSocketCount: () => number
    disconnectSocketClients: () => void
  }
}

async function loginAsAna(page: Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill('ana@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('a pending order recovers its terminal REST state after socket reconnect', async ({ page }) => {
  await loginAsAna(page)
  await page.goto('/checkout')
  await expect(page.getByText('1.6721 ETH', { exact: true })).toBeVisible()

  const order = await page.evaluate(async () => {
    const cart = (await fetch('/api/cart').then((response) => response.json())) as { id: string }
    const quote = (await fetch(`/api/carts/${cart.id}/quote`).then((response) => response.json())) as {
      quoteVersion: number
    }
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
    return response.json() as Promise<{ id: string; status: string }>
  })
  expect(order.status).toBe('pending')

  await page.goto(`/orders/${order.id}`)
  await expect(page.getByRole('status')).toContainText('Pendente')
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)

  await page.evaluate(() => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    mocks.disconnectSocketClients()
  })
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(0)
  const recoveryEvent = await page.evaluate((orderId) => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    return mocks.simulateOrderUpdate({ orderId, status: 'confirmed' })
  }, order.id)
  expect(recoveryEvent).not.toBeNull()
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
})
