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
  // Local: 1 retry absorve contenção de CPU quando muitos workers rodam em
  // paralelo contra o mesmo `webServer` (ex.: os cenários de latência
  // artificial de `loading-states.spec.ts`). CI: 2, mais conservador.
  retries: process.env.CI ? 2 : 1,
  // Timeout por teste um pouco acima do padrão (30s) — a suíte inteira roda
  // dezenas de testes em paralelo contra um único `webServer` de `vite dev`;
  // sob essa contenção, um teste com vários round-trips reais (ex.: um fluxo
  // de compra completo) pode legitimamente passar de 30s sem que nada esteja
  // errado. `expect` timeout sobe junto, pelo mesmo motivo.
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Um único `webServer` (`vite dev`) atende TODOS os workers; com o número
  // de specs desta fase, o paralelismo default (≈ nº de CPUs) saturava esse
  // processo único e causava timeouts intermitentes mesmo em testes triviais
  // (ex.: `smoke.spec.ts`) — não um bug nos specs, contenção de recurso
  // compartilhado. Baixado para 2 (era 4): com 4, uma reprodução do gate
  // `val-testing-strategy` (`--retries=0`, suíte completa) ainda produziu
  // falhas de carregamento de módulo do próprio runner ("Cannot find module
  // .../*.spec.ts") afetando dezenas de testes simultaneamente — sintoma de
  // contenção de I/O de arquivo no Windows sob muitos processos Node/Chromium
  // concorrentes, não um bug de teste. 2 workers elimina essa classe de
  // falha nesta máquina (verificado com 3 execuções consecutivas da suíte
  // completa, `--retries=0`, 0 falhas — ver `ARCHITECTURE.md` §16.5/§16.6).
  workers: 2,
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
