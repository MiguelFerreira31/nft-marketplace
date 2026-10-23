import { expect, test, type Page } from '@playwright/test'

/**
 * Readme §9, item 1: "Busca, filtros combinados, ordenação, paginação e
 * restauração pelo histórico." As 48 fixtures (`features/mocks/fixtures/nfts.ts`,
 * 6 categorias × 8 itens) são o que torna isto exercitável sem precisar de
 * nenhum cenário extra do painel de mocks — só a listagem padrão.
 *
 * Os cards são escopados à seção "Catálogo" (não "Destaques", que também
 * renderiza `<article>` e é uma consulta fixa independente dos filtros).
 */
function catalogGrid(page: Page) {
  return page.locator('section[aria-label="Catálogo"] article')
}

test('search narrows results by title/collection/creator and "Limpar filtros" resets to the unfiltered catalog', async ({ page }) => {
  await page.goto('/')
  // Primeira asserção após o load: tolerante a um cold-start do dev server/worker MSW sob carga paralela.
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })

  await page.getByLabel('Buscar').fill('Checkpoint Perdido')
  await expect(page).toHaveURL(/search=Checkpoint/, { timeout: 2000 })
  await expect(catalogGrid(page)).toHaveCount(1)
  await expect(catalogGrid(page).getByText('Checkpoint Perdido')).toBeVisible()

  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
  await expect(catalogGrid(page)).toHaveCount(12)
})

test('search for an unmatched term shows the empty state with a way to clear filters', async ({ page }) => {
  await page.goto('/')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })
  await page.getByLabel('Buscar').fill('nenhum nft tem esse nome')
  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
  await expect(page.getByText('Não encontramos itens para a busca e os filtros atuais.')).toBeVisible()
  // Dois botões "Limpar filtros" coexistem aqui (toolbar + estado vazio) — qualquer um limpa o mesmo filtro.
  await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
  await expect(catalogGrid(page)).toHaveCount(12)
})

test('combining two categories, a price range and sort order reset pagination to page 1', async ({ page }) => {
  await page.goto('/')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })

  // "Arte" (8 itens) sozinha cabe numa página — a paginação nem aparece.
  await page.getByRole('checkbox', { name: 'Arte' }).check({ force: true })
  await expect(page).toHaveURL(/page=1/)
  await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' })).toHaveCount(0)
  await expect(catalogGrid(page)).toHaveCount(8)

  // Combinando com "Música" (+8 itens = 16) excede o tamanho de página (12) — paginação aparece.
  await page.getByRole('checkbox', { name: 'Música' }).check({ force: true })
  await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' })).toBeVisible()
  await expect(page.getByText('Página 1 de 2')).toBeVisible()
  await expect(catalogGrid(page)).toHaveCount(12)

  await page.getByLabel('Ordenar por').selectOption({ label: 'Menor preço' })
  await expect(page.getByLabel('Ordenar por')).toHaveValue('price-asc')
  await expect(page.getByText('Página 1 de 2')).toBeVisible()

  // Navega para a página 2 e então estreita por preço — a mudança de filtro
  // deve reiniciar a paginação de volta à página 1 (readme §3: "mudança de
  // filtro deve reiniciar a paginação"), mesmo vindo da página 2.
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(catalogGrid(page)).toHaveCount(4)

  await page.getByLabel('Preço mín. (ETH)').fill('0.2')
  await expect(page).toHaveURL(/priceMinEth=%220\.2%22/, { timeout: 2000 })
  await expect(page.getByText(/^Página 1 de \d/)).toBeVisible()
})

test('pagination combined with category/sort filters survives browser back, forward and refresh', async ({ page }) => {
  await page.goto('/')
  await expect(catalogGrid(page)).toHaveCount(12, { timeout: 10_000 })
  await page.getByRole('checkbox', { name: 'Arte' }).check({ force: true })
  await page.getByRole('checkbox', { name: 'Música' }).check({ force: true })
  await page.getByLabel('Ordenar por').selectOption({ label: 'Menor preço' })
  await expect(page.getByText('Página 1 de 2')).toBeVisible()

  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(catalogGrid(page)).toHaveCount(4)

  await page.goBack()
  await expect(page.getByText('Página 1 de 2')).toBeVisible()
  await expect(catalogGrid(page)).toHaveCount(12)
  await expect(page.getByRole('checkbox', { name: 'Arte' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Música' })).toBeChecked()
  await expect(page.getByLabel('Ordenar por')).toHaveValue('price-asc')

  await page.goForward()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(catalogGrid(page)).toHaveCount(4)

  // Um refresh na página 2 filtrada precisa restaurar o MESMO estado (URL é a
  // única fonte de verdade — readme §3: "sobreviver a refresh").
  await page.reload()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Arte' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Música' })).toBeChecked()
})
