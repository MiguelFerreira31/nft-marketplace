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

declare const window: {
  __mocks__?: {
    simulateNftUpdate: (input: {
      nftId: string
      editionId?: string
      priceEth?: string
      availableQuantity?: number
    }) => Promise<TestNftEvent>
    replayNftEvent: (event: TestNftEvent) => void
    connectedSocketCount: () => number
  }
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('switching accounts replaces the realtime socket and private cart cache', async ({ page }) => {
  await login(page, 'ana@example.com')
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)

  const previousSessionEvent = await page.evaluate(async () => {
    const mocks = window.__mocks__
    if (!mocks) throw new Error('Painel de mocks indisponível')
    return mocks.simulateNftUpdate({
      nftId: 'nft-music-1',
      editionId: 'nft-music-1-edition-1',
      priceEth: '0.999',
    })
  })

  const mobileMenu = page.getByRole('button', { name: 'Abrir menu' })
  if (await mobileMenu.isVisible()) await mobileMenu.click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect.poll(() => page.evaluate(() => fetch('/api/session').then((response) => response.json()))).toBeNull()
  const loggedOutMobileMenu = page.getByRole('button', { name: 'Abrir menu' })
  if (await loggedOutMobileMenu.isVisible()) await loggedOutMobileMenu.click()
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()
  await page.evaluate((event) => {
    window.__mocks__?.replayNftEvent(event)
  }, previousSessionEvent)

  await login(page, 'bruno@example.com')
  await expect
    .poll(() => page.evaluate(() => fetch('/api/session').then((response) => response.json())))
    .toMatchObject({ user: { name: 'Bruno Souza' } })
  await expect
    .poll(() => page.evaluate(() => window.__mocks__?.connectedSocketCount()))
    .toBe(1)

  const cart = await page.evaluate(async () => {
    const response = await fetch('/api/cart')
    return (await response.json()) as { items: unknown[] }
  })
  expect(cart.items).toHaveLength(0)
})
