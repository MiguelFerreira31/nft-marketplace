import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * Worker MSW para o browser (dev/demo/Playwright). Ativado por
 * configuração via `VITE_ENABLE_MOCKS` (seção 6: "ativada por configuração
 * e estar disponível no build de demonstração") — ver chamada condicional
 * em `src/main.tsx`. O binding Socket.IO (`@mswjs/socket.io-binding`) é
 * adicionado aqui pelo `agent-mocks` na Fase 2.3.
 */
export const worker = setupWorker(...handlers)
