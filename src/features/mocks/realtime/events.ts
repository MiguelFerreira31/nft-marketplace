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
 * Em `msw@3.0.3`, `WebSocketHandler` remove `/socket.io/` antes de avaliar o
 * padrão. O binding usa um regex amplo e filtra o path original no handler;
 * conexões alheias (como HMR do Vite) são encaminhadas com
 * `connection.server.connect()`.
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
 * `connection.server`) não mudou entre essas versões.
 */
const SOCKET_IO_PATH_PATTERN = /\/socket\.io\//

const realtimeLink = ws.link(/.*/)

interface SocketIoEmitter {
  emit: (event: string, ...data: unknown[]) => void
}

interface ConnectedClient {
  socket: SocketIoEmitter
  closeTransport: () => void
}

const connectedClients = new Map<string, ConnectedClient>()

export const realtimeHandler = realtimeLink.addEventListener('connection', (connection) => {
  const url = connection.client.url.toString()
  if (!SOCKET_IO_PATH_PATTERN.test(url)) {
    // Não é a nossa conexão Socket.IO simulada (ex.: HMR do Vite em dev) — encaminha de verdade.
    connection.server.connect()
    return
  }

  const io = toSocketIo(connection)
  connectedClients.set(connection.client.id, {
    socket: io.client,
    closeTransport: () => connection.client.close(1001, 'Simulated connection loss'),
  })

  const removeClient = () => connectedClients.delete(connection.client.id)
  connection.client.addEventListener('close', removeClient)
  connection.server.addEventListener('close', removeClient)
})

function broadcast(event: 'nft.updated' | 'order.updated', envelope: NftUpdatedEvent | OrderUpdatedEvent): void {
  for (const client of connectedClients.values()) {
    client.socket.emit(event, envelope)
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

export function disconnectConnectedClients(): void {
  for (const client of connectedClients.values()) {
    client.closeTransport()
  }
}
