import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Server MSW para ambiente Node (Playwright/unit tests que não rodam no
 * browser real, caso necessário). Reaproveita os mesmos `handlers` do
 * `browser.ts` — único ponto de verdade para os cenários simulados (seção
 * 6: "reutilizando contratos e cenários entre desenvolvimento, demonstração
 * e testes").
 */
export const server = setupServer(...handlers)
