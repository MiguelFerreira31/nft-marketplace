import { expect, test } from '@playwright/test'

/**
 * Readme §9, item 2: "Acesso direto ao detalhe e tratamento de recurso
 * inexistente." Inclui a regressão permanente do bug corrigido na Fase 4
 * (ver `ARCHITECTURE.md` §10.4): um `notFound()` de NFT inexistente precisa
 * renderizar DENTRO do `AppShell` (header/footer preservados), não substituir
 * a árvore inteira como o 404 de rota desconhecida.
 */

test('direct access to an existing NFT renders its gallery, editions and favorite control', async ({ page }) => {
  await page.goto('/nfts/nft-music-1')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('img', { name: /imagem 1 de/ })).toBeVisible()
  await expect(page.getByText(/ETH/).first()).toBeVisible()
  await expect(page.getByLabel(/Entrar para favoritar|favoritos/i)).toBeVisible()
})

test('a nonexistent NFT id renders the 404 state with the header/footer shell preserved', async ({ page }) => {
  await page.goto('/nfts/nft-does-not-exist')

  // O shell (header com navegação) continua de pé — não é o fallback de
  // rota desconhecida substituindo a árvore inteira.
  await expect(page.getByRole('link', { name: 'NFT Marketplace' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await expect(page.getByText('Este NFT não existe ou foi removido do marketplace.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
})

test('an unknown route renders the root 404 while an existing route keeps working after navigating back', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')
  await expect(page.getByRole('link', { name: 'NFT Marketplace' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
  await expect(page.locator('section[aria-label="Catálogo"] article')).toHaveCount(12, { timeout: 10_000 })
})

test('a sold-out NFT detail blocks adding to cart and a low-stock edition caps the quantity stepper', async ({ page }) => {
  await page.goto('/nfts/nft-sold-out-demo')
  await expect(page.getByText('Todas as edições deste NFT estão esgotadas.')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Adicionar ao carrinho' })).toBeDisabled()

  await page.goto('/nfts/nft-low-stock-demo')
  await expect(page.getByText('1 disponíveis', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
})
