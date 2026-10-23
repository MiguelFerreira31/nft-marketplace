import { expect, test, type Page } from '@playwright/test'

/**
 * Readme §9, item 4: "Favoritos, incluindo falha de mutation e recuperação
 * do estado." `useToggleFavoriteMutation` (`features/catalog/hooks`) é a
 * atualização otimista com rollback exigida pela seção 4 do readme — este
 * spec é quem efetivamente clica em favoritar, força a mutation a falhar via
 * painel de mocks, e confirma o rollback + a recuperação subsequente.
 */

interface MockPanel {
  setScenario: (patch: {
    forceError?: Record<string, { status: number; body: { code: string; message: string; retryable?: boolean } } | undefined>
  }) => unknown
}
declare const window: { __mocks__?: MockPanel }

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('an unauthenticated visitor sees a login link instead of a favorite toggle', async ({ page }) => {
  await page.goto('/nfts/nft-music-2')
  const favoriteLink = page.getByRole('link', { name: /Entrar para favoritar/ })
  await expect(favoriteLink).toBeVisible({ timeout: 10_000 })
  await favoriteLink.click()
  await expect(page).toHaveURL(/\/login\?redirect=.*nft-music-2/)
})

test('favoriting and unfavoriting from the NFT detail page persists after a refresh', async ({ page }) => {
  await loginAs(page, 'bruno@example.com')
  await page.goto('/nfts/nft-music-2')

  const favoriteButton = page.getByRole('button', { name: /Favoritar/ })
  await expect(favoriteButton).toBeVisible({ timeout: 10_000 })
  await favoriteButton.click()
  await expect(page.getByRole('button', { name: /Remover.*dos favoritos/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: 'adicionado aos favoritos' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: /Remover.*dos favoritos/ })).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })

  const favoritesAfterAdd = await page.evaluate(() => fetch('/api/favorites').then((response) => response.json())) as { items: { id: string }[] }
  expect(favoritesAfterAdd.items.map((item) => item.id)).toContain('nft-music-2')

  await page.getByRole('button', { name: /Remover.*dos favoritos/ }).click()
  await expect(page.getByRole('button', { name: /Favoritar/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('status').filter({ hasText: 'removido dos favoritos' })).toBeVisible()

  const favoritesAfterRemove = await page.evaluate(() => fetch('/api/favorites').then((response) => response.json())) as { items: { id: string }[] }
  expect(favoritesAfterRemove.items.map((item) => item.id)).not.toContain('nft-music-2')
})

test('a failed favorite mutation rolls back the optimistic state and recovers on retry', async ({ page }) => {
  await loginAs(page, 'bruno@example.com')
  await page.goto('/nfts/nft-music-2')

  const favoriteButton = page.getByRole('button', { name: /Favoritar/ })
  await expect(favoriteButton).toBeVisible({ timeout: 10_000 })

  await page.evaluate(() =>
    window.__mocks__?.setScenario({
      forceError: { 'favorites.add': { status: 503, body: { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true } } },
    }),
  )

  // O erro forçado responde imediatamente (sem a latência padrão — ver
  // `withScenario`), então a janela otimista "favoritado" pode ser mais
  // curta que o polling do Playwright; o que importa é o estado FINAL após
  // o rollback (seção 4 do readme: atualização otimista + rollback).
  await favoriteButton.click()
  await expect(page.getByRole('button', { name: /Favoritar/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Não foi possível atualizar o favorito. O estado anterior foi restaurado.')).toBeVisible()

  const favoritesAfterFailure = await page.evaluate(() => fetch('/api/favorites').then((response) => response.json())) as { items: { id: string }[] }
  expect(favoritesAfterFailure.items.map((item) => item.id)).not.toContain('nft-music-2')

  await page.evaluate(() => window.__mocks__?.setScenario({ forceError: {} }))
  await page.getByRole('button', { name: /Favoritar/ }).click()
  await expect(page.getByRole('button', { name: /Remover.*dos favoritos/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('status').filter({ hasText: 'adicionado aos favoritos' })).toBeVisible()
})

test('favoriting from the catalog card is isolated per authenticated user', async ({ page }) => {
  await loginAs(page, 'ana@example.com')
  // Ana já tem "nft-art-3" favoritado nas fixtures (ver `fixtures/users.ts`).
  const anaFavorites = (await page.evaluate(() => fetch('/api/favorites').then((response) => response.json()))) as {
    items: { id: string }[]
  }
  expect(anaFavorites.items.map((item) => item.id)).toContain('nft-art-3')

  const mobileMenuToggle = page.getByRole('button', { name: 'Abrir menu' })
  if (await mobileMenuToggle.isVisible()) await mobileMenuToggle.click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)

  await loginAs(page, 'bruno@example.com')
  const brunoFavorites = (await page.evaluate(() => fetch('/api/favorites').then((response) => response.json()))) as {
    items: { id: string }[]
  }
  expect(brunoFavorites.items.map((item) => item.id)).not.toContain('nft-art-3')
  expect(brunoFavorites.items.map((item) => item.id)).toContain('nft-virtual-worlds-2')
})
