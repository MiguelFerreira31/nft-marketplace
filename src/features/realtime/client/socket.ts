import { io, type Socket } from 'socket.io-client'
import type { RealtimeClientToServerEvents, RealtimeServerToClientEvents } from '@/shared/types'

export type RealtimeSocket = Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents>

/**
 * Fábrica do client Socket.IO tipado (`nft.updated`, `order.updated` — ver
 * `src/shared/types/events.ts`). Esta função só CRIA a conexão; ela
 * deliberadamente NÃO:
 *
 * - conecta automaticamente (`autoConnect: false`) — quem decide quando
 *   conectar/desconectar (ex.: só após sessão resolvida) é o provider de
 *   `agent-realtime` (Fase 6);
 * - registra nenhum listener — reconciliação com REST, tolerância a
 *   duplicata/evento antigo e liberação de listeners no fim do ciclo de
 *   vida são lógica de domínio da Fase 6, documentada em
 *   `ARCHITECTURE.md`, não desta camada de transporte.
 *
 * Nenhum componente deve simular estes eventos diretamente (ex.: chamando
 * setters) — isso é um critério eliminatório da seção 11. O binding do lado
 * do servidor simulado (`@mswjs/socket.io-binding` ou equivalente) é
 * responsabilidade do `agent-mocks` (Fase 2.3).
 */
export function createRealtimeSocket(): RealtimeSocket {
  return io(import.meta.env.VITE_SOCKET_URL ?? '/', {
    autoConnect: false,
    withCredentials: true,
    transports: ['websocket'],
  })
}
