import { defineConfig, devices } from '@playwright/test'

/**
 * Configuração base de Playwright (Task 0.1). As suites reais dos 12
 * cenários da seção 9 do readme.md — busca/filtros, favoritos, carrinho,
 * compra completa, falha de pagamento, tempo real, teclado/foco, skeletons
 * — são escopo da Fase 10 (`agent-tests`), executadas contra os handlers
 * MSW (Fase 2) com estado isolado por teste e relógio/latência controlados
 * nos casos sensíveis a tempo (ver `ARCHITECTURE.md`).
 *
 * Aqui só garantimos que `npm run test:e2e` roda de ponta a ponta a partir
 * de um checkout limpo: sobe o `dev` server com os mocks habilitados e
 * executa o smoke test em `tests/e2e/smoke.spec.ts`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5190',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5190',
    url: 'http://localhost:5190',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_ENABLE_MOCKS: 'true',
    },
  },
})
