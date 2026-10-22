import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/shared/types'

/**
 * Binding Socket.IO (seção 6 do readme + Task 2.3 do `PLAN.md`).
 *
 * TRANSPORTE: `ws.link()` (núcleo do `msw`) intercepta a conexão WebSocket
 * crua que o `socket.io-client` abre (o app força `transports: ['websocket']`
 * em `features/realtime/client/socket.ts`, então não há fallback para
 * polling HTTP a interceptar). `@mswjs/socket.io-binding#toSocketIo()`
 * decodifica/codifica o protocolo Engine.IO/Socket.IO por cima dessa conexão
 * crua, incluindo o handshake inicial (pacotes `0`/`40`) — isso é o que
 * permite `socket.on('nft.updated', ...)` no cliente REAL
 * (`socket.io-client`) funcionar sem nenhuma adaptação no código do cliente.
 *
 * LIMITAÇÃO/DESVIO DOCUMENTADO (ver `ARCHITECTURE.md` para a investigação
 * completa): em `msw@3.0.3`, `ws.link(pattern)` com qualquer `pattern`
 * diferente do literal `'*'` (testado: `RegExp`, string relativa `/socket.io/`,
 * string absoluta `ws://host:porta/socket.io/`) NUNCA invoca o listener de
 * `connection` — a conexão é tratada como "sem handler correspondente" e
 * segue para a rede real (confirmado isolando `onUnhandledFrame: 'warn'`,
 * que loga explicitamente "intercepted a WebSocket connection without a
 * matching event handler" para a URL correta). Isolar o mesmo
 * `WebSocketInterceptor` que o `msw` usa por baixo dos panos, aplicado
 * direto (sem `msw`), funciona perfeitamente — o bug está especificamente
 * no roteamento por padrão de URL do `ws.link()` desta versão (API ainda
 * residente num módulo interno chamado "experimental"). Correção adotada:
 * usar `ws.link('*')` (comprovadamente funcional) e fazer a filtragem por
 * URL manualmente dentro do próprio handler — exatamente o rótulo recíproco
 * de "`onUnhandledFrame`" que o `msw` faria por nós se o matching por
 * padrão funcionasse. Qualquer conexão que não seja para `/socket.io/`
 * (ex.: o próprio WebSocket de HMR do Vite em `npm run dev`) é encaminhada
 * de verdade via `connection.server.connect()` — a partir daí,
 * `WebSocketServerConnection` (`@mswjs/interceptors`) encaminha mensagens/
 * close bidirecionalmente sem código manual adicional.
 *
 * LIMITAÇÃO DE AMBIENTE: a interceptação do `msw` só reescreve o
 * `WebSocket` GLOBAL. Num bundle para browser (dev/demo/Playwright-em-
 * browser, que é o ambiente real desta aplicação), o Vite resolve
 * `socket.io-client` → `engine.io-client` para a variante que usa esse
 * `WebSocket` global — a interceptação funciona de ponta a ponta. Em
 * Node.js PURO (sem bundler, ex.: um teste rodando `server.ts` fora de um
 * browser), `socket.io-client` importa a variante que usa o pacote `ws` em
 * vez do `WebSocket` global, e esta interceptação não o alcança.
 *
 * `@mswjs/socket.io-binding` declara peer dependency `msw@^2.10.2`; este
 * projeto usa `msw@^3.0.3` (instalado com `--legacy-peer-deps`). A API usada
 * aqui (`toSocketIo(connection)` operando sobre `connection.client`/
 * `connection.server`) não mudou entre essas versões — só o roteamento por
 * padrão do `ws.link()`, contornado acima, é afetado.
 */
const SOCKET_IO_PATH_PATTERN = /\/socket\.io\//

const realtimeLink = ws.link('*')

interface SocketIoEmitter {
  emit: (event: string, ...data: unknown[]) => void
}

const connectedClients = new Map<string, SocketIoEmitter>()

export const realtimeHandler = realtimeLink.addEventListener('connection', (connection) => {
  const url = connection.client.url.toString()
  if (!SOCKET_IO_PATH_PATTERN.test(url)) {
    // Não é a nossa conexão Socket.IO simulada (ex.: HMR do Vite em dev) — encaminha de verdade.
    connection.server.connect()
    return
  }

  const io = toSocketIo(connection)
  connectedClients.set(connection.client.id, io.client)

  connection.client.addEventListener('close', () => {
    connectedClients.delete(connection.client.id)
  })
})

function broadcast(event: 'nft.updated' | 'order.updated', envelope: NftUpdatedEvent | OrderUpdatedEvent): void {
  for (const client of connectedClients.values()) {
    client.emit(event, envelope)
  }
}

export function emitNftUpdated(envelope: NftUpdatedEvent): void {
  broadcast('nft.updated', envelope)
}

export function emitOrderUpdated(envelope: OrderUpdatedEvent): void {
  broadcast('order.updated', envelope)
}

/** Quantidade de clients Socket.IO atualmente conectados — exposto só para diagnóstico via `window.__mocks__` (ver `handlers/control.ts`). */
export function connectedClientCount(): number {
  return connectedClients.size
}
