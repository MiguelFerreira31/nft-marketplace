import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Server MSW para ambiente Node (testes que não rodam num browser real,
 * caso necessário). Reaproveita os mesmos `handlers` do `browser.ts` —
 * único ponto de verdade para os cenários simulados (seção 6: "reutilizando
 * contratos e cenários entre desenvolvimento, demonstração e testes").
 *
 * LIMITAÇÃO (ver `realtime/events.ts` e `ARCHITECTURE.md`): o binding
 * Socket.IO só intercepta conexões que usam o `WebSocket` GLOBAL do
 * ambiente. Em Node puro (sem bundler), `socket.io-client` usa o pacote
 * `ws` em vez do `WebSocket` global, então este `server` NÃO intercepta
 * `nft.updated`/`order.updated` nesse cenário específico — ele continua
 * válido para todos os handlers REST. A aplicação real nunca roda em Node
 * puro (sempre browser, bundlado pelo Vite), então isto não afeta o app;
 * só testes Node "crus" de WebSocket precisariam de um ajuste adicional
 * (ex.: rodar num browser real via Playwright).
 */
export const server = setupServer(...handlers)
