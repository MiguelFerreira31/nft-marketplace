import { expect, test } from '@playwright/test'

/**
 * Smoke test da Fase 0: confirma que o app sobe, a rota "/" resolve via
 * TanStack Router e um componente shadcn/ui renderiza. As suites reais dos
 * 12 cenários da seção 9 (busca/filtros, compra completa, tempo real,
 * teclado/foco, etc.) são adicionadas pelo `agent-tests` na Fase 10.
 */
test('home route renders the Fase 0 placeholder', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'NFT Marketplace' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'shadcn/ui ok' })).toBeVisible()
})
