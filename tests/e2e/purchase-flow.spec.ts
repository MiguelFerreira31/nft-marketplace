import { expect, test } from '@playwright/test'

/**
 * Readme §9, item 6: "Compra completa, do catálogo ao recibo confirmado."
 * `checkout.spec.ts` audita o pagamento isoladamente (a partir de um
 * carrinho já preparado); este spec percorre a jornada inteira com uma
 * conta nova — cadastro, carteira, busca no catálogo, detalhe, carrinho e
 * pagamento — até o recibo.
 */
test('a brand-new collector searches the catalog, buys an NFT and reaches a confirmed receipt', async ({ page }) => {
  const email = `jornada-${Date.now()}@example.com`

  await page.goto('/register')
  await page.getByLabel('Nome').fill('Colecionador Jornada')
  await page.getByLabel('E-mail').fill(email)
  await page.locator('#register-password').fill('Colecionar123!')
  await page.locator('#register-confirm-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)

  // Sem carteira cadastrada o checkout não tem como prosseguir — cadastra uma primeiro.
  await page.goto('/account/wallets')
  const primaryForm = page.getByRole('form', { name: 'Carteira principal: cadastro e edição' })
  await primaryForm.getByLabel('Endereço da carteira').fill('0x1234567890abcdef1234567890abcdef12345678')
  await primaryForm.getByLabel('Rede').selectOption('ethereum-mainnet-sim')
  await primaryForm.getByRole('button', { name: 'Cadastrar carteira' }).click()
  await expect(primaryForm.getByRole('status').filter({ hasText: 'Carteira principal salva com sucesso.' })).toBeVisible()

  // Busca no catálogo e navega para o detalhe de um NFT com edição única e estoque disponível.
  await page.goto('/')
  const catalogGrid = page.locator('section[aria-label="Catálogo"] article')
  await expect(catalogGrid).toHaveCount(12, { timeout: 10_000 })
  await page.getByLabel('Buscar').fill('Checkpoint Perdido')
  // A busca é debounced (400ms) — espera o filtro de fato reduzir a grade a
  // 1 item antes de clicar; clicar contra a lista ainda não filtrada é uma
  // corrida que pode não navegar a lugar nenhum (achado da Fase 10).
  await expect(catalogGrid).toHaveCount(1, { timeout: 2_000 })
  await catalogGrid.getByRole('link').filter({ hasText: 'Checkpoint Perdido' }).click()
  await expect(page).toHaveURL(/\/nfts\/nft-gaming-7/)
  await expect(page.getByRole('heading', { name: 'Checkpoint Perdido' })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible()

  await page.goto('/cart')
  await expect(page.getByRole('listitem').filter({ hasText: 'Checkpoint Perdido' })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('link', { name: 'Ir para pagamento' }).click()

  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { name: 'Pagamento' })).toBeVisible()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await page.getByRole('button', { name: 'Revisar e aceitar cotação atual' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()

  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/orders\/order-/)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('order-receipt')).toContainText('Checkpoint Perdido')
  await expect(page.getByText(/Referência da transação simulada/)).toBeVisible()

  await page.goto('/cart')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})
