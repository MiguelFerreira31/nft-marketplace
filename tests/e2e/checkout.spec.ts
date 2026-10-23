import { expect, test, type Page } from '@playwright/test'

interface CreateOrderPayload {
  cartId: string
  quoteVersion: number
  walletId: string
  network: string
}

interface MockPanel {
  simulateNftUpdate: (input: { nftId: string; editionId?: string; priceEth?: string; availableQuantity?: number }) => Promise<unknown>
  simulateOrderUpdate: (input: { orderId: string; status: 'confirmed' | 'refused' }) => Promise<unknown>
  setScenario: (patch: {
    ordersCreateTimeoutOnce?: boolean
    paymentOutcome?: 'confirmed' | 'refused' | 'pending-forever'
    paymentResolutionDelayMs?: number
    latencyOverridesMs?: Record<string, { minMs: number; maxMs: number }>
    forceError?: Record<string, { status: number; body: { error: { code: string; message: string; retryable?: boolean } } }>
    sessionForceExpired?: boolean
  }) => unknown
}

declare const window: { __mocks__?: MockPanel }

async function loginAsAna(page: Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill('ana@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

async function prepareCheckout(page: Page) {
  await loginAsAna(page)
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible()
  await expect(page.getByRole('main').getByText('Ana Martins', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Carteira cadastrada')).toBeVisible()
  await expect(page.getByLabel('Rede da carteira', { exact: true })).toBeVisible()
  await page.getByLabel('Carteira cadastrada').selectOption({ label: 'Carteira de testes' })
  await expect(page.getByLabel('Rede da carteira', { exact: true })).toHaveValue('polygon-sim')
  await page.getByLabel('Carteira cadastrada').selectOption({ label: 'Carteira principal' })
  await expect(page.getByLabel('Rede da carteira', { exact: true })).toHaveValue('ethereum-mainnet-sim')
  await expect(page.getByText('1.6721 ETH', { exact: true })).toBeVisible()
}

async function connectAndAccept(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Revisar e aceitar cotação atual' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
}

test('checkout submits a reviewed quote and renders the confirmed receipt', async ({ page }) => {
  await prepareCheckout(page)
  await connectAndAccept(page)

  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Referência da transação simulada/)).toBeVisible()
  await expect(page.getByText('1.6721 ETH', { exact: true })).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('repeated clicks and timeout recovery reuse one idempotency key and payload', async ({ page }) => {
  const orderRequests: { key: string | undefined; payload: CreateOrderPayload }[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) {
      orderRequests.push({
        key: request.headers()['idempotency-key'],
        payload: request.postDataJSON() as CreateOrderPayload,
      })
    }
  })
  await prepareCheckout(page)
  await page.evaluate(() =>
    window.__mocks__?.setScenario({ ordersCreateTimeoutOnce: true, paymentOutcome: 'pending-forever' }),
  )
  await connectAndAccept(page)

  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('button', { name: 'Enviando pedido…' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Retomar tentativa anterior' })).toBeEnabled({ timeout: 15_000 })
  expect(orderRequests).toHaveLength(1)
  expect(orderRequests[0].key).toBeTruthy()

  await page.reload()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByRole('button', { name: 'Retomar tentativa anterior' })).toBeEnabled()
  await page.getByRole('button', { name: 'Retomar tentativa anterior' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('status')).toContainText('Pendente')
  await expect.poll(() => orderRequests.length).toBe(2)
  expect(orderRequests[1].key).toBe(orderRequests[0].key)
  expect(orderRequests[1].payload).toEqual(orderRequests[0].payload)

  const mismatch = await page.evaluate(async ({ key, payload }) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key ?? '' },
      body: JSON.stringify({ ...payload, network: 'different-network' }),
    })
    return { status: response.status, body: await response.json() }
  }, orderRequests[0])
  expect(mismatch.status).toBe(409)
  expect((mismatch.body as { error: { reason: string } }).error.reason).toBe('IDEMPOTENCY_KEY_MISMATCH')

  const orderId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.evaluate((id) => window.__mocks__?.simulateOrderUpdate({ orderId: id, status: 'confirmed' }), orderId)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
})

test('wallet connection refusal sends no order and payment refusal preserves the cart', async ({ page }) => {
  const orderRequests: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) orderRequests.push(request.url())
  })
  await prepareCheckout(page)
  await page.getByRole('button', { name: 'Recusar conexão' }).click()
  await expect(page.getByRole('status')).toContainText('Conexão recusada')
  expect(orderRequests).toHaveLength(0)

  await page.evaluate(() =>
    window.__mocks__?.setScenario({ paymentOutcome: 'refused', paymentResolutionDelayMs: 100 }),
  )
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Revisar e aceitar cotação atual' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('status')).toContainText('Recusado', { timeout: 10_000 })
  await expect(page.getByText('Referência da transação simulada')).toHaveCount(0)

  const cart = await page.evaluate(() =>
    fetch('/api/cart').then((response) => response.json() as Promise<{ items: unknown[] }>),
  )
  expect(cart.items).toHaveLength(2)
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('button', { name: 'Revisar e aceitar cotação atual' })).toBeVisible()
})

test('transient order failure leaves cart items intact', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => window.__mocks__?.setScenario({
    forceError: {
      'orders.create': {
        status: 503,
        body: { error: { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true } },
      },
    },
  }))
  await connectAndAccept(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByText(/Sua compra permanece no carrinho/)).toBeVisible()

  const cart = await page.evaluate(() =>
    fetch('/api/cart').then((response) => response.json() as Promise<{ items: unknown[] }>),
  )
  expect(cart.items).toHaveLength(2)
})

test('pending order recovers after refresh and resolves through realtime', async ({ page }) => {
  await prepareCheckout(page)
  await page.evaluate(() => window.__mocks__?.setScenario({ paymentOutcome: 'pending-forever' }))
  await connectAndAccept(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('status')).toContainText('Pendente')

  await page.reload()
  await expect(page.getByRole('status')).toContainText('Pendente')
  const orderId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.evaluate((id) => window.__mocks__?.simulateOrderUpdate({ orderId: id, status: 'confirmed' }), orderId)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Referência da transação simulada')).toBeVisible()
})

test('receipt remains an immutable order snapshot after catalog changes', async ({ page }) => {
  await prepareCheckout(page)
  await connectAndAccept(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })

  const receipt = page.getByTestId('order-receipt')
  const originalReceipt = await receipt.innerText()
  await page.evaluate(() =>
    window.__mocks__?.simulateNftUpdate({
      nftId: 'nft-music-1',
      editionId: 'nft-music-1-edition-1',
      priceEth: '0.999',
    }),
  )
  expect(await receipt.innerText()).toBe(originalReceipt)
})

test('last-second stale quote is rejected and requires an explicit re-review', async ({ page }) => {
  let orderRequestCount = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/orders')) orderRequestCount += 1
  })
  await prepareCheckout(page)
  await connectAndAccept(page)

  await page.evaluate(() =>
    window.__mocks__?.setScenario({ latencyOverridesMs: { 'quote.get': { minMs: 1500, maxMs: 1500 } } }),
  )
  const quoteRequest = page.waitForRequest((request) => request.url().includes('/api/carts/') && request.url().endsWith('/quote'))
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await quoteRequest
  await page.evaluate(() =>
    window.__mocks__?.simulateNftUpdate({
      nftId: 'nft-music-1',
      editionId: 'nft-music-1-edition-1',
      priceEth: '0.777',
    }),
  )

  await expect(page.getByText('2.5061 ETH', { exact: true })).toBeVisible()
  await expect(page.getByText(/A cotação mudou desde sua revisão/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar e aceitar cotação atual' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  expect(orderRequestCount).toBe(0)

  await page.evaluate(() => window.__mocks__?.setScenario({ latencyOverridesMs: {} }))
  await page.getByRole('button', { name: 'Revisar e aceitar cotação atual' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
})

test('stale cached session is revalidated before checkout access', async ({ page }) => {
  await page.clock.install()
  await loginAsAna(page)
  const cartLink = page.getByRole('link', { name: 'Carrinho', exact: true }).first()
  if (!(await cartLink.isVisible())) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Carrinho', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Ir para pagamento' })).toBeVisible()
  await page.clock.fastForward(10_001)
  await page.evaluate(() =>
    window.__mocks__?.setScenario({
      sessionForceExpired: true,
      latencyOverridesMs: { 'session.get': { minMs: 1500, maxMs: 1500 } },
    }),
  )
  const sessionRequest = page.waitForRequest((request) => request.url().endsWith('/api/session'))
  const sessionResponse = page.waitForResponse((response) => response.url().endsWith('/api/session'))
  await page.getByRole('link', { name: 'Ir para pagamento' }).click()
  await sessionRequest
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toHaveCount(0)
  await sessionResponse
  await expect(page).toHaveURL(/\/login\?redirect=.*checkout/, { timeout: 10_000 })
})

test('concurrent requests for one cart reuse its pending order and foreign carts are forbidden', async ({ page }) => {
  await loginAsAna(page)
  const result = await page.evaluate(async () => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    mocks.setScenario({ paymentOutcome: 'pending-forever' })
    const cart = (await fetch('/api/cart').then((response) => response.json())) as { id: string }
    const quote = (await fetch(`/api/carts/${cart.id}/quote`).then((response) => response.json())) as {
      quoteVersion: number
    }
    const wallets = (await fetch('/api/wallets').then((response) => response.json())) as {
      items: { id: string; network: string }[]
    }
    const payload: CreateOrderPayload = {
      cartId: cart.id,
      quoteVersion: quote.quoteVersion,
      walletId: wallets.items[0].id,
      network: wallets.items[0].network,
    }
    const createOrder = (body: CreateOrderPayload) =>
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify(body),
      })

    const forbidden = await createOrder({ ...payload, cartId: 'user-bruno' })
    const invalidNetwork = await createOrder({ ...payload, network: wallets.items[1].network })
    const responses = await Promise.all([createOrder(payload), createOrder(payload)])
    return {
      forbiddenStatus: forbidden.status,
      invalidNetworkStatus: invalidNetwork.status,
      results: await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          order: (await response.json()) as { id: string; status: string },
        })),
      ),
    }
  })
  expect(result.forbiddenStatus).toBe(403)
  expect(result.invalidNetworkStatus).toBe(400)
  expect(result.results.map(({ status }) => status).sort()).toEqual([200, 201])
  expect(result.results[0].order.id).toBe(result.results[1].order.id)
  expect(result.results[0].order.status).toBe('pending')
})
