import { expect, test, type Page } from '@playwright/test'

/**
 * Readme §9, item 3: "Cadastro, login, expiração de sessão, logout e troca
 * de usuário." Cadastro/login básicos e a troca de usuário Ana→Bruno (com
 * isolamento de carrinho/socket) já são exercitados em `account.spec.ts` e
 * `realtime-session.spec.ts`; este spec cobre o que falta: conflito de
 * cadastro, credenciais inválidas, logout isolado, e os TRÊS caminhos de
 * expiração de sessão descritos em `useSessionExpiryRedirect.ts`:
 *
 * 1. "Dura" — navegação direta (reload completo) a uma rota privada quando a
 *    sessão já está expirada no backend simulado (`requireAuth` intercepta
 *    no `beforeLoad`, antes de qualquer componente montar).
 * 2. "SPA via 401" — uma mutation disparada a partir de uma tela já carregada
 *    recebe 401 `INVALID_SESSION`; o interceptor do Axios notifica
 *    `session-expiry.ts` e o redirecionamento acontece sem reload.
 * 3. "Passiva" — nenhuma requisição falha; `useSessionQuery` descobre a
 *    expiração no seu próprio `refetchInterval` (30s) enquanto o usuário
 *    permanece parado na mesma tela privada.
 */

interface MockPanel {
  setScenario: (patch: { sessionForceExpired?: boolean }) => unknown
}
declare const window: { __mocks__?: MockPanel }

async function loginAsAna(page: Page) {
  await page.goto('/login')
  await page.locator('#login-email').fill('ana@example.com')
  await page.locator('#login-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
}

test('registering with an already-used e-mail surfaces a conflict on the email field', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('Novo Colecionador')
  await page.getByLabel('E-mail').fill('ana@example.com')
  await page.locator('#register-password').fill('Colecionar123!')
  await page.locator('#register-confirm-password').fill('Colecionar123!')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)
})

test('client-side validation blocks an obviously invalid registration before hitting the API', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Nome').fill('A')
  await page.getByLabel('E-mail').fill('not-an-email')
  await page.locator('#register-password').fill('short')
  await page.locator('#register-confirm-password').fill('different')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Informe um nome com ao menos 2 caracteres.')).toBeVisible()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await expect(page.getByText('A senha deve ter ao menos 8 caracteres.')).toBeVisible()
  await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
})

test('logging in with the wrong password shows a generic field-level error', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#login-email').fill('ana@example.com')
  await page.locator('#login-password').fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('E-mail ou senha incorretos.').first()).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('session expiration during a hard navigation reload redirects straight to login with the destination preserved', async ({ page }) => {
  await loginAsAna(page)
  await page.evaluate(() => window.__mocks__?.setScenario({ sessionForceExpired: true }))

  // Navegação DURA: não é um clique em `<Link>` dentro do app — é uma nova
  // carga de documento inteira para uma rota privada, com a sessão já
  // expirada no backend simulado antes mesmo do primeiro render.
  await page.goto('/account/wallets')
  await expect(page).toHaveURL(/\/login\?redirect=.*account%2Fwallets/, { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})

test('a 401 from an in-page mutation (SPA) redirects to login without a full reload', async ({ page }) => {
  await loginAsAna(page)
  await page.goto('/account/profile')
  const profileForm = page.getByRole('form', { name: 'Editar dados do perfil' })
  await expect(profileForm.getByLabel('Nome')).toHaveValue('Ana Martins', { timeout: 10_000 })

  await page.evaluate(() => window.__mocks__?.setScenario({ sessionForceExpired: true }))
  await profileForm.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(page).toHaveURL(/\/login\?redirect=.*account%2Fprofile/, { timeout: 10_000 })
})

test('a passive expiration (refetchInterval) while idle on a private route redirects without any failed request', async ({ page }) => {
  await page.clock.install()
  await loginAsAna(page)
  await page.goto('/account/profile')
  const profileForm = page.getByRole('form', { name: 'Editar dados do perfil' })
  await expect(profileForm.getByLabel('Nome')).toHaveValue('Ana Martins', { timeout: 10_000 })

  // Nenhuma ação do usuário a partir daqui — só o relógio avançando além do
  // `refetchInterval: 30s` de `useSessionQuery` enquanto a sessão já está
  // forçada a expirada no backend simulado.
  await page.evaluate(() => window.__mocks__?.setScenario({ sessionForceExpired: true }))
  await page.clock.fastForward(31_000)

  await expect(page).toHaveURL(/\/login\?redirect=.*account%2Fprofile/, { timeout: 10_000 })
})

test('logout clears the private cache and the header falls back to the guest links', async ({ page }) => {
  await loginAsAna(page)
  await page.goto('/account/profile')
  await expect(page.getByLabel('Nome')).toHaveValue('Ana Martins', { timeout: 10_000 })

  const mobileMenuToggle = page.getByRole('button', { name: 'Abrir menu' })
  if (await mobileMenuToggle.isVisible()) await mobileMenuToggle.click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/\?page=1&pageSize=12$/)
  await expect.poll(() => page.evaluate(() => fetch('/api/session').then((response) => response.json()))).toBeNull()

  const loggedOutMenuToggle = page.getByRole('button', { name: 'Abrir menu' })
  if (await loggedOutMenuToggle.isVisible()) await loggedOutMenuToggle.click()
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toBeVisible()

  // Rota privada fica protegida de novo após o logout.
  await page.goto('/account/profile')
  await expect(page).toHaveURL(/\/login\?redirect=.*account%2Fprofile/)
})
