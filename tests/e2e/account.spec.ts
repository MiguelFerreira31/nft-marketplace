import { expect, test, type Page } from '@playwright/test'

interface MockPanel {
  getScenario: () => { forceError: Record<string, { status: number } | undefined> }
  setScenario: (patch: {
    forceError?: Record<
      string,
      { status: number; body: { code: string; message: string; retryable?: boolean; fieldErrors?: Record<string, string[]> } }
    >
  }) => unknown
}

declare const window: { __mocks__?: MockPanel }

async function loginAs(page: Page, email = 'ana@example.com', password = 'Colecionar123!') {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

async function registerWalletTestUser(page: Page) {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('Colecionador de teste')
  await page.getByLabel('E-mail').fill(`wallets-${Date.now()}@example.com`)
  await page.locator('#register-password').fill('Colecionar123!')
  await page.locator('#register-confirm-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('profile and avatar validation, save, and survive refresh', async ({ page }) => {
  await loginAs(page)
  await page.goto('/account/profile')

  const profileForm = page.getByRole('form', { name: 'Editar dados do perfil' })
  await profileForm.getByLabel('Nome').fill('A')
  await profileForm.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(profileForm.getByText(/Informe um nome entre 2 e/)).toBeVisible()

  await profileForm.getByLabel('Nome').fill('Ana Martins Atualizada')
  await profileForm.getByLabel('E-mail').fill('bruno@example.com')
  await profileForm.getByLabel('Biografia').fill('Colecionadora de arte, fotografia e mundos digitais.')
  await profileForm.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(profileForm.getByText('Este e-mail já está em uso por outra conta.')).toBeVisible()

  await profileForm.getByLabel('E-mail').fill('ana.atualizada@example.com')
  await page.evaluate(() => window.__mocks__?.setScenario({
    forceError: {
      'profile.update': {
        status: 503,
        body: { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true },
      },
    },
  }))
  await profileForm.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Falha temporária.' })).toBeVisible()
  await page.evaluate(() => window.__mocks__?.setScenario({ forceError: {} }))
  await profileForm.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Dados do perfil atualizados.' })).toBeVisible()
  await expect(profileForm.getByLabel('Nome')).toHaveValue('Ana Martins Atualizada')

  const avatarFile = {
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2kAAAAASUVORK5CYII=',
      'base64',
    ),
  }
  await page.getByLabel('Avatar').setInputFiles({ name: 'avatar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByText('Escolha uma imagem PNG, JPEG, WebP ou GIF.')).toBeVisible()
  await page.evaluate(() => window.__mocks__?.setScenario({
    forceError: {
      'profile.updateAvatar': {
        status: 503,
        body: { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true },
      },
    },
  }))
  await page.getByLabel('Avatar').setInputFiles(avatarFile)
  await expect(page.getByText('Falha temporária.')).toBeVisible()
  await page.evaluate(() => window.__mocks__?.setScenario({ forceError: {} }))
  await page.getByLabel('Avatar').setInputFiles(avatarFile)
  await expect(page.getByRole('status').filter({ hasText: 'Avatar atualizado.' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Avatar de Ana Martins Atualizada' })).toHaveAttribute('src', /^data:image\/png;base64,/)

  await page.reload()
  await expect(page.getByLabel('Nome')).toHaveValue('Ana Martins Atualizada')
  await expect(page.getByLabel('E-mail')).toHaveValue('ana.atualizada@example.com')
  await expect(page.getByLabel('Biografia')).toHaveValue('Colecionadora de arte, fotografia e mundos digitais.')
  await expect(page.getByRole('img', { name: 'Avatar de Ana Martins Atualizada' })).toHaveAttribute('src', /^data:image\/png;base64,/)
})

test('password validation and change persist without exposing the password', async ({ page }) => {
  await loginAs(page)
  await page.goto('/account/profile')

  const passwordForm = page.getByRole('form', { name: 'Alterar senha' })
  await passwordForm.getByLabel('Senha atual').fill('senha-incorreta')
  await passwordForm.getByRole('textbox', { name: 'Nova senha', exact: true }).fill('curta')
  await passwordForm.getByRole('textbox', { name: 'Confirmar nova senha', exact: true }).fill('diferente')
  await passwordForm.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(passwordForm.getByText('A nova senha deve ter ao menos 8 caracteres.')).toBeVisible()
  await expect(passwordForm.getByText('As senhas não coincidem.')).toBeVisible()

  await passwordForm.getByRole('textbox', { name: 'Nova senha', exact: true }).fill('SenhaNova123!')
  await passwordForm.getByRole('textbox', { name: 'Confirmar nova senha', exact: true }).fill('SenhaNova123!')
  await passwordForm.getByLabel('Senha atual').fill('senha-incorreta')
  await passwordForm.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(passwordForm.getByText('Senha atual incorreta.')).toBeVisible()

  await passwordForm.getByLabel('Senha atual').fill('Colecionar123!')
  await page.evaluate(() => window.__mocks__?.setScenario({
    forceError: {
      'profile.changePassword': {
        status: 503,
        body: { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true },
      },
    },
  }))
  await passwordForm.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Falha temporária.' })).toBeVisible()
  await page.evaluate(() => window.__mocks__?.setScenario({ forceError: {} }))
  await passwordForm.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Senha alterada com sucesso.' })).toBeVisible()
  await expect(passwordForm.getByLabel('Senha atual')).toHaveValue('')
  await page.reload()

  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }))
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('E-mail ou senha incorretos.').first()).toBeVisible()
  await page.locator('#login-password').fill('SenhaNova123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
})

test('create and update both wallet slots, validate API failures, and persist after refresh', async ({ page }) => {
  await registerWalletTestUser(page)
  await page.goto('/account/wallets')
  const primaryForm = page.getByRole('form', { name: 'Carteira principal: cadastro e edição' })
  const secondaryForm = page.getByRole('form', { name: 'Carteira secundária: cadastro e edição' })
  await expect(primaryForm).toBeVisible()
  const mismatchedKindResponse = await page.evaluate(async () => {
    const response = await fetch('/api/wallets/primary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'secondary',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'ethereum-mainnet-sim',
      }),
    })
    return { status: response.status, body: await response.json() }
  })
  expect(mismatchedKindResponse.status, JSON.stringify(mismatchedKindResponse.body)).toBe(400)

  const primaryAddress = '0x1234567890abcdef1234567890abcdef12345678'
  const secondaryAddress = '0xabcdef1234567890abcdef1234567890abcdef12'

  await primaryForm.getByLabel('Endereço da carteira').fill('não-é-um-endereço')
  await primaryForm.getByRole('button', { name: 'Cadastrar carteira' }).click()
  await expect(primaryForm.getByText(/endereço EVM válido/i)).toBeVisible()

  await primaryForm.getByLabel('Endereço da carteira').fill(primaryAddress)
  await primaryForm.getByLabel('Nome para identificar (opcional)').fill('Minha principal')
  await primaryForm.getByLabel('Rede').selectOption('ethereum-mainnet-sim')
  await page.evaluate(() => window.__mocks__?.setScenario({
    forceError: {
      'wallets.upsert': {
        status: 400,
        body: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', fieldErrors: { address: ['Endereço rejeitado pela API.'] } },
      },
    },
  }))
  await primaryForm.getByRole('button', { name: 'Cadastrar carteira' }).click()
  await expect(primaryForm.getByText('Endereço rejeitado pela API.')).toBeVisible()
  await expect(primaryForm.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')
  await page.evaluate(() => window.__mocks__?.setScenario({ forceError: {} }))
  await primaryForm.getByRole('button', { name: 'Cadastrar carteira' }).click()
  await expect(primaryForm.getByRole('status').filter({ hasText: 'Carteira principal salva com sucesso.' })).toBeVisible()

  await secondaryForm.getByLabel('Endereço da carteira').fill(secondaryAddress)
  await secondaryForm.getByLabel('Nome para identificar (opcional)').fill('Minha secundária')
  await secondaryForm.getByLabel('Rede').selectOption('polygon-sim')
  await secondaryForm.getByRole('button', { name: 'Cadastrar carteira' }).click()
  await expect(secondaryForm.getByRole('status').filter({ hasText: 'Carteira secundária salva com sucesso.' })).toBeVisible()

  const updatedPrimaryAddress = '0x234567890abcdef1234567890abcdef123456789'
  const updatedSecondaryAddress = '0xbcdef1234567890abcdef1234567890abcdef123'
  await primaryForm.getByLabel('Endereço da carteira').fill(updatedPrimaryAddress)
  await primaryForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primaryForm.getByRole('status').filter({ hasText: 'Carteira principal salva com sucesso.' })).toBeVisible()
  await secondaryForm.getByLabel('Endereço da carteira').fill(updatedSecondaryAddress)
  await secondaryForm.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondaryForm.getByRole('status').filter({ hasText: 'Carteira secundária salva com sucesso.' })).toBeVisible()

  const forcedWalletError = await page.evaluate(() => {
    window.__mocks__?.setScenario({
      forceError: {
        'wallets.upsert': {
          status: 503,
          body: { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true },
        },
      },
    })
    return window.__mocks__?.getScenario().forceError['wallets.upsert']?.status
  })
  expect(forcedWalletError).toBe(503)
  await primaryForm.getByLabel('Endereço da carteira').fill('0x34567890abcdef1234567890abcdef1234567890')
  const upsertResponse = page.waitForResponse((response) => response.url().endsWith('/api/wallets/primary'))
  await primaryForm.getByRole('button', { name: 'Salvar carteira' }).click()
  expect((await upsertResponse).status()).toBe(503)
  await expect(page.getByRole('alert').filter({ hasText: 'Falha temporária.' })).toBeVisible()

  await page.reload()
  const savedPrimary = page.getByRole('form', { name: 'Carteira principal: cadastro e edição' })
  const savedSecondary = page.getByRole('form', { name: 'Carteira secundária: cadastro e edição' })
  await expect(savedPrimary.getByLabel('Endereço da carteira')).toHaveValue(updatedPrimaryAddress)
  await expect(savedPrimary.getByLabel('Rede')).toHaveValue('ethereum-mainnet-sim')
  await expect(savedPrimary.getByLabel('Nome para identificar (opcional)')).toHaveValue('Minha principal')
  await expect(savedSecondary.getByLabel('Endereço da carteira')).toHaveValue(updatedSecondaryAddress)
  await expect(savedSecondary.getByLabel('Rede')).toHaveValue('polygon-sim')
  await expect(savedSecondary.getByLabel('Nome para identificar (opcional)')).toHaveValue('Minha secundária')

  const cartStatus = await page.evaluate(async () => {
    const response = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editionId: 'nft-music-1-edition-1', quantity: 1 }),
    })
    return response.status
  })
  expect(cartStatus).toBe(201)
  await page.goto('/checkout')
  await page.getByLabel('Carteira cadastrada').selectOption({ label: 'Minha secundária' })
  await expect(page.getByLabel('Rede da carteira')).toHaveValue('polygon-sim')
  await expect(page.getByText(updatedSecondaryAddress)).toBeVisible()
})
