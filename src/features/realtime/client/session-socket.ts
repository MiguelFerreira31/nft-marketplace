import { createRealtimeSocket, type RealtimeSocket } from './socket'

/**
 * Socket único atrelado ao CICLO DE VIDA DA SESSÃO (não ao ciclo de vida de
 * um componente qualquer). A Fase 6 (`agent-realtime`) é quem vai de fato
 * `.connect()` e registrar `.on('nft.updated'|'order.updated', ...)` —
 * aqui (Fase 3, `agent-auth`) só se garante a metade que é responsabilidade
 * de sessão: nenhuma subscription pode sobreviver a um logout/expiração/
 * troca de usuário (readme §3: "Logout e troca de usuário devem limpar
 * dados privados em cache e subscriptions da sessão anterior"; critério
 * eliminatório da seção 11).
 *
 * Por isso `useLogoutMutation` e `useSessionExpiryRedirect` (ambos nesta
 * Fase) chamam `disconnectSessionSocket()` — e qualquer hook que a Fase 6
 * vier a escrever deve obter a conexão por `getSessionSocket()` (nunca
 * chamando `createRealtimeSocket()` diretamente fora deste módulo), para
 * que a mesma instância seja a que é desconectada/descartada aqui.
 */
let activeSocket: RealtimeSocket | null = null

/** Obtém (criando se preciso) o socket da sessão atual. Não conecta por conta própria. */
export function getSessionSocket(): RealtimeSocket {
  if (!activeSocket) {
    activeSocket = createRealtimeSocket()
  }
  return activeSocket
}

/**
 * Remove TODOS os listeners e desconecta o socket da sessão atual, depois
 * descarta a instância — a próxima `getSessionSocket()` (próximo login)
 * cria uma conexão nova, sem nenhum listener herdado da sessão anterior.
 * Idempotente: seguro chamar mesmo sem conexão ativa (ex.: usuário nunca
 * conectou o socket nesta sessão).
 */
export function disconnectSessionSocket(): void {
  if (!activeSocket) return
  activeSocket.removeAllListeners()
  activeSocket.disconnect()
  activeSocket = null
}
