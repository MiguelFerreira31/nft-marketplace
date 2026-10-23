import { expect, test, type Page } from '@playwright/test'

/**
 * Readme §9: "Inclua regressão visual de início, detalhe, carrinho e
 * pagamento, com baselines versionadas e dados estáveis."
 *
 * Determinismo:
 * - `latencyMs: { minMs: 0, maxMs: 0 }` remove a variação de latência padrão
 *   do painel de mocks — cada tela é capturada só depois do conteúdo real
 *   (nunca o skeleton) estar visível, então a latência em si não deveria
 *   importar, mas zerá-la encurta o teste e remove qualquer corrida residual.
 * - `page.emulateMedia({ reducedMotion: 'reduce' })` força
 *   `prefers-reduced-motion`, que o shimmer dos skeletons e qualquer
 *   transição CSS já respeitam (Task 1.2/Fase 9) — nenhuma animação em voo
 *   no momento da captura.
 * - As fixtures (NFTs, usuários, cupons) e as imagens placeholder (SVG
 *   data-URI determinístico, `fixtures/placeholder-image.ts`) nunca mudam
 *   entre execuções; cada teste parte de um contexto de browser novo
 *   (storage isolado), então os dados de Ana/Bruno estão sempre no estado
 *   de semeadura.
 * - Os botões flutuantes dos devtools (TanStack Query/Router, só em `DEV`)
 *   são mascarados — não fazem parte da UI de produção e não devem
 *   participar do diff visual.
 * - Pagamento é fotografado ANTES da confirmação (sem conectar carteira/
 *   enviar o pedido): o recibo tem id/timestamp/referência de transação
 *   gerados por execução, incompatíveis com uma baseline versionada.
 */

const DEVTOOLS_SELECTOR = [
  'button[aria-label*="devtools" i]',
  'button:has-text("Open TanStack Router Devtools")',
  'button:has-text("Open Tanstack query devtools")',
].join(', ')

interface MockPanel {
  setScenario: (patch: { latencyMs: { minMs: number; maxMs: number } }) => unknown
}
declare const window: { __mocks__?: MockPanel }
// `document.fonts` (CSS Font Loading API) — `tsconfig.node.json` não inclui
// a lib DOM, daí a declaração ambiente local (mesmo padrão de `window` acima).
declare const document: { fonts: { ready: Promise<unknown> } }

async function prepareDeterministicPage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => window.__mocks__?.setScenario({ latencyMs: { minMs: 0, maxMs: 0 } }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

/**
 * Espera a fonte variável `Geist` (carregada via `@font-face`,
 * `@fontsource-variable/geist`) terminar de carregar antes de fotografar.
 * Sem isto, sob contenção de CPU/rede o screenshot pode capturar texto
 * ainda renderizado com a fonte de fallback do sistema — diferença de
 * pixel que não é uma regressão visual real, só uma corrida contra o
 * carregamento assíncrono da fonte (achado do gate `val-testing-strategy`,
 * reproduzido especificamente em `home`/`NFT detail` no projeto desktop,
 * onde o texto ocupa mais área da tela).
 */
async function waitForFontsReady(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
}

async function loginAsAna(page: Page) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible({ timeout: 15_000 })
  await page.locator('#login-email').fill('ana@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('home (início)', async ({ page }) => {
  await prepareDeterministicPage(page)
  await page.reload()
  await expect(page.locator('section[aria-label="Catálogo"] article')).toHaveCount(12, { timeout: 15_000 })
  await expect(page.locator('section[aria-label="Destaques"] article')).toHaveCount(4, { timeout: 15_000 })
  await waitForFontsReady(page)

  await expect(page).toHaveScreenshot('home.png', {
    fullPage: true,
    mask: [page.locator(DEVTOOLS_SELECTOR)],
    timeout: 15_000,
  })
})

test('NFT detail', async ({ page }) => {
  await prepareDeterministicPage(page)
  await page.goto('/nfts/nft-music-5')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('img', { name: /imagem 1 de/ })).toBeVisible({ timeout: 15_000 })
  await waitForFontsReady(page)

  await expect(page).toHaveScreenshot('nft-detail.png', {
    fullPage: true,
    mask: [page.locator(DEVTOOLS_SELECTOR)],
    timeout: 15_000,
  })
})

test('cart (carrinho)', async ({ page }) => {
  await prepareDeterministicPage(page)
  await loginAsAna(page)
  await page.goto('/cart')
  await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 15_000 })
  await waitForFontsReady(page)

  await expect(page).toHaveScreenshot('cart.png', {
    fullPage: true,
    mask: [page.locator(DEVTOOLS_SELECTOR)],
    timeout: 15_000,
  })
})

test('payment (pagamento)', async ({ page }) => {
  await prepareDeterministicPage(page)
  await loginAsAna(page)
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Carteira cadastrada')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 15_000 })
  await waitForFontsReady(page)

  await expect(page).toHaveScreenshot('payment.png', {
    fullPage: true,
    mask: [page.locator(DEVTOOLS_SELECTOR)],
    timeout: 15_000,
  })
})
