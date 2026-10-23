import { expect, test, type Page } from '@playwright/test'

/**
 * Readme §9, item 5: "Carrinho, quantidades, remoção, cupom e persistência
 * após refresh/login." Totais já são auditados linha a linha em
 * `checkout.spec.ts`/`realtime.spec.ts`; este spec foca no que ainda não
 * tinha cobertura dedicada: estoque na quantidade, remoção, os três
 * resultados de cupom (válido/inválido/expirado) e a persistência
 * guest→conta via refresh/login.
 */

async function loginAs(page: Page, email: string) {
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('adding an item from the detail page shows it in the cart and persists after a refresh', async ({ page }) => {
  await loginAs(page, 'bruno@example.com') // Bruno começa com o carrinho vazio (fixtures).
  await page.goto('/nfts/nft-gaming-3')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.locator('input[type="number"]')).toHaveValue('2')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible()

  await page.goto('/cart')
  const row = page.getByRole('listitem').filter({ hasText: 'Guardião Pixelado' })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await expect(row.locator('input[type="number"]')).toHaveValue('2')

  await page.reload()
  const rowAfterReload = page.getByRole('listitem').filter({ hasText: 'Guardião Pixelado' })
  await expect(rowAfterReload.locator('input[type="number"]')).toHaveValue('2', { timeout: 10_000 })
})

test('the quantity stepper is capped at the available stock and removing the item empties the cart', async ({ page }) => {
  await loginAs(page, 'bruno@example.com')
  await page.goto('/nfts/nft-low-stock-demo')
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible()

  await page.goto('/cart')
  const row = page.getByRole('listitem').first()
  await expect(row).toBeVisible({ timeout: 10_000 })
  await expect(row.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()

  await row.getByRole('button', { name: 'Remover' }).click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('applying a valid coupon discounts the total; invalid and expired codes show distinct errors; removing restores the total', async ({ page }) => {
  await loginAs(page, 'ana@example.com') // Ana já tem itens no carrinho (fixtures).
  await page.goto('/cart')
  await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 10_000 })
  const totalBeforeCoupon = await page.getByRole('definition').last().innerText()

  await page.getByLabel('Cupom de desconto').fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom inválido ou inexistente.')).toBeVisible()

  await page.getByLabel('Cupom de desconto').fill('EXPIRADO15')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este cupom expirou.')).toBeVisible()

  await page.getByLabel('Cupom de desconto').fill('BEMVINDO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('BEMVINDO10 (-10%)')).toBeVisible()
  await expect(page.getByText(/^Desconto/)).toBeVisible()
  const totalWithCoupon = await page.getByRole('definition').last().innerText()
  expect(totalWithCoupon).not.toBe(totalBeforeCoupon)

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByLabel('Cupom de desconto')).toBeVisible()
  const totalAfterRemoval = await page.getByRole('definition').last().innerText()
  expect(totalAfterRemoval).toBe(totalBeforeCoupon)
})

test('a guest cart survives a refresh and merges into the account cart on login', async ({ page }) => {
  await page.goto('/nfts/nft-gaming-5')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText('Adicionado ao carrinho.')).toBeVisible()

  await page.goto('/cart')
  await expect(page.getByRole('listitem').filter({ hasText: 'Loot Fantasma' })).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Loot Fantasma' })).toBeVisible({ timeout: 10_000 })

  // Bruno começa sem itens no carrinho — login deve preservar o item do visitante (readme §3: "Carrinho").
  await page.goto('/login')
  await page.locator('#login-email').fill('bruno@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)

  await page.goto('/cart')
  await expect(page.getByRole('listitem').filter({ hasText: 'Loot Fantasma' })).toBeVisible({ timeout: 10_000 })
})
