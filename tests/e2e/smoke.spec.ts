import { expect, test } from '@playwright/test'

/**
 * Smoke test das Fases 0/1: confirma que o app sobe, a rota "/" resolve via
 * TanStack Router, o shell (shadcn/ui) renderiza e o skeleton do catálogo
 * (Task 1.2) aparece sem erro. As suites reais dos 12 cenários da seção 9
 * (busca/filtros, compra completa, tempo real, teclado/foco, etc.) são
 * adicionadas pelo `agent-tests` na Fase 10.
 */
test('home route renders the shell and the catalog skeleton', async ({ page }) => {
  await page.goto('/')

  // Logo do header: único elemento visível de forma idêntica em desktop e
  // mobile (os links de navegação colapsam num menu fechado por padrão no
  // viewport mobile — ver `src/components/layout/site-header.tsx`).
  await expect(page.getByRole('link', { name: 'NFT Marketplace' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'NFT Marketplace' })).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]').first()).toBeVisible()
})
