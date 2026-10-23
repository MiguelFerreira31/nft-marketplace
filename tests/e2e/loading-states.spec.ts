import { expect, test } from '@playwright/test'

/**
 * Readme §9, item 12: "Skeletons durante carregamento lento, feedback de
 * falha e recuperação após nova tentativa." Usa os controles de cenário do
 * painel de mocks (`latencyOverridesMs`, `networkDown`, `forceError`,
 * `forceEmpty` — ver `features/mocks/scenario.ts`) para tornar o
 * carregamento lento/falho determinístico, em vez de depender da latência
 * aleatória padrão.
 *
 * Padrão usado em todos os testes: carregar a página uma vez com o cenário
 * padrão (garante que `window.__mocks__` já existe), configurar o cenário
 * via `setScenario` (persistido em `localStorage`, lido pelo worker MSW no
 * próximo boot) e então `page.reload()` para que o próximo carregamento da
 * tela use o cenário configurado.
 */

interface MockPanel {
  setScenario: (patch: {
    latencyOverridesMs?: Record<string, { minMs: number; maxMs: number }>
    networkDown?: string[]
    forceEmpty?: string[]
    forceError?: Record<string, { status: number; body: { code: string; message: string; retryable?: boolean } }>
  }) => unknown
}
declare const window: { __mocks__?: MockPanel }

function catalogGrid(page: import('@playwright/test').Page) {
  return page.locator('section[aria-label="Catálogo"] article')
}

test('a slow catalog response shows the grid skeleton first, then the real grid', async ({ page }) => {
  await page.goto('/')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })

  await page.evaluate(() =>
    window.__mocks__?.setScenario({ latencyOverridesMs: { 'nfts.list': { minMs: 3_000, maxMs: 3_000 } } }),
  )
  await page.reload()

  const skeleton = page.getByLabel('Carregando catálogo de NFTs')
  await expect(skeleton).toBeVisible({ timeout: 10_000 })
  await expect(skeleton).toHaveAttribute('aria-busy', 'true')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })
  await expect(skeleton).toHaveCount(0)
})

test('a slow NFT detail response shows the detail skeleton first, then the real content', async ({ page }) => {
  await page.goto('/nfts/nft-music-5')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })

  await page.evaluate(() =>
    window.__mocks__?.setScenario({ latencyOverridesMs: { 'nfts.detail': { minMs: 3_000, maxMs: 3_000 } } }),
  )
  await page.reload()

  const skeleton = page.getByLabel('Carregando detalhe do NFT')
  await expect(skeleton).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  await expect(skeleton).toHaveCount(0)
})

test('an unavailable connection shows the catalog error state, and clearing the scenario lets retry recover', async ({ page }) => {
  await page.goto('/')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })

  await page.evaluate(() => window.__mocks__?.setScenario({ networkDown: ['nfts.list'] }))
  await page.reload()

  const errorState = page.getByRole('alert')
  await expect(errorState).toBeVisible({ timeout: 10_000 })
  await expect(errorState).toContainText('Não foi possível conectar ao servidor')

  await page.evaluate(() => window.__mocks__?.setScenario({ networkDown: [] }))
  await errorState.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })
})

test('a forced 500 on the NFT detail shows the error state, and retry recovers after the scenario clears', async ({ page }) => {
  await page.goto('/nfts/nft-music-6')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })

  await page.evaluate(() =>
    window.__mocks__?.setScenario({
      forceError: { 'nfts.detail': { status: 500, body: { code: 'TRANSIENT_ERROR', message: 'Falha simulada no detalhe.', retryable: true } } },
    }),
  )
  await page.reload()

  // `describeQueryError` mapeia TRANSIENT_ERROR para uma mensagem genérica de
  // retry, ignorando a mensagem exata do servidor (mesma regra de
  // `mapAuthError`/`mapAccountError` — ver `api-error-message.ts`).
  const errorState = page.getByRole('alert')
  await expect(errorState).toContainText('Falha temporária no servidor. Tente novamente em alguns segundos.', { timeout: 10_000 })

  await page.evaluate(() => window.__mocks__?.setScenario({ forceError: {} }))
  await errorState.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
})

test('an empty catalog scenario shows the empty state without an active-filter message or a "clear filters" button', async ({ page }) => {
  await page.goto('/')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })

  await page.evaluate(() => window.__mocks__?.setScenario({ forceEmpty: ['nfts.list'] }))
  await page.reload()

  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Não há NFTs disponíveis no catálogo neste momento.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Limpar filtros' })).toHaveCount(0)
})

test('a slow cart shows the cart summary skeleton before the real items and totals', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#login-email').fill('ana@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)

  await page.evaluate(() => window.__mocks__?.setScenario({ latencyOverridesMs: { 'cart.get': { minMs: 3_000, maxMs: 3_000 } } }))
  await page.goto('/cart')

  const skeleton = page.getByLabel('Carregando carrinho')
  await expect(skeleton).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(skeleton).toHaveCount(0)
})
