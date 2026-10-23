import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Readme §9, item 11: "Navegação por teclado, foco de diálogos e validação
 * de formulários." Não existe nenhum diálogo/drawer/sheet modal no projeto
 * (inventariado na Fase 9, ver `ARCHITECTURE.md` §15.4) — o menu mobile do
 * `SiteHeader` é um disclosure inline, não um modal, então o que este spec
 * testa em seu lugar é exatamente isso: o disclosure é alcançável e
 * operável só de teclado, igual aos demais controles cobertos aqui.
 */

// `document` só existe no contexto do browser onde o callback de `evaluate`
// roda — `tsconfig.node.json` (que tipa `tests/`) não inclui a lib DOM, daí
// a declaração ambiente local (mesmo padrão já usado para `window.__mocks__`
// nos demais specs).
declare const document: { activeElement: unknown }

/** Tab repetidamente a partir do foco atual até `locator` ficar focado, ou falha após `maxTabs`. */
async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 40): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    if (await locator.evaluate((element) => element === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
  }
  await expect(locator).toBeFocused()
}

test('tabbing from the top of the home page reaches the search field, a category filter and the first NFT link, all operable by keyboard', async ({ page }) => {
  await page.goto('/')
  // Espera o conteúdo REAL do catálogo (não o skeleton) antes de começar a
  // tabular — sob contenção de CPU/rede o primeiro load pode legitimamente
  // demorar mais que o timeout padrão (achado do gate `val-testing-strategy`,
  // mesmo padrão corrigido em `smoke.spec.ts`/`catalog-search.spec.ts`).
  await expect(page.locator('section[aria-label="Catálogo"] article')).toHaveCount(12, { timeout: 15_000 })

  const searchField = page.getByLabel('Buscar')
  await tabUntilFocused(page, searchField)
  await expect(searchField).toBeFocused()

  const firstCategoryCheckbox = page.getByRole('checkbox', { name: 'Arte' })
  await tabUntilFocused(page, firstCategoryCheckbox)
  await expect(firstCategoryCheckbox).not.toBeChecked()
  await page.keyboard.press('Space')
  await expect(firstCategoryCheckbox).toBeChecked()
  await expect(page.locator('section[aria-label="Catálogo"] article')).toHaveCount(8, { timeout: 15_000 })

  const firstCardTitleLink = page.locator('section[aria-label="Catálogo"] article').first().getByRole('link').last()
  await tabUntilFocused(page, firstCardTitleLink)
  await expect(firstCardTitleLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nfts\//)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
})

test('the quantity stepper and "Adicionar ao carrinho" on the NFT detail page are fully operable by keyboard', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#login-email').fill('bruno@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)

  await page.goto('/nfts/nft-gaming-6')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })

  const increaseButton = page.getByRole('button', { name: 'Aumentar quantidade' })
  await increaseButton.focus()
  await expect(increaseButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('input[type="number"]')).toHaveValue('2')

  const addToCartButton = page.getByRole('button', { name: 'Adicionar ao carrinho' })
  await tabUntilFocused(page, addToCartButton)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible()
})

test('the mobile navigation disclosure is reachable and operable by keyboard alone (no modal/drawer exists in the project)', async ({ page }) => {
  // O disclosure do menu só existe abaixo do breakpoint `md` (768px, readme
  // §8) — decidido pelo viewport do projeto Playwright, não por uma leitura
  // de visibilidade logo após o `goto` (que corre antes do primeiro render).
  test.skip((page.viewportSize()?.width ?? 1440) >= 768, 'disclosure do menu só existe abaixo do breakpoint md')

  await page.goto('/')
  // O `aria-label` do botão alterna entre "Abrir menu"/"Fechar menu" conforme
  // o estado (ver `SiteHeader`) — localizado por `aria-controls`, que é
  // estável nos dois estados.
  const menuToggle = page.locator('button[aria-controls="mobile-nav"]')
  await expect(menuToggle).toBeVisible({ timeout: 15_000 })
  await tabUntilFocused(page, menuToggle)
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Enter')
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'true')

  const cartLink = page.locator('#mobile-nav').getByRole('link', { name: 'Carrinho', exact: true })
  await tabUntilFocused(page, cartLink)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cart$/)
})

test('an invalid login submission marks fields with aria-invalid wired to their visible error message', async ({ page }) => {
  await page.goto('/login')
  // Espera o formulário real (não um `goto` ainda em voo) antes de clicar —
  // mesmo padrão de robustez usado no resto da suíte sob contenção.
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Entrar' }).click()

  const emailField = page.locator('#login-email')
  const passwordField = page.locator('#login-password')
  await expect(emailField).toHaveAttribute('aria-invalid', 'true')
  await expect(passwordField).toHaveAttribute('aria-invalid', 'true')

  const emailErrorId = await emailField.getAttribute('aria-describedby')
  const passwordErrorId = await passwordField.getAttribute('aria-describedby')
  expect(emailErrorId).toBeTruthy()
  expect(passwordErrorId).toBeTruthy()
  await expect(page.locator(`#${emailErrorId}`)).toHaveText('Informe seu e-mail.')
  await expect(page.locator(`#${passwordErrorId}`)).toHaveText('Informe sua senha.')

  // Corrigir o campo remove o estado inválido na submissão seguinte.
  await emailField.fill('ana@example.com')
  await passwordField.fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
})
