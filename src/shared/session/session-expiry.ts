/**
 * Ponte mínima e desacoplada entre o transporte (Axios, `shared/api/http.ts`)
 * e a camada de sessão/roteamento (`useSessionExpiryRedirect.ts`), sem criar
 * dependência circular entre os dois módulos.
 *
 * `http.ts` só sabe DETECTAR um 401 `INVALID_SESSION` em qualquer resposta
 * (de qualquer recurso autenticado — perfil, carteiras, carrinho, pedidos,
 * etc., não só `/session`). Ele não sabe navegar nem limpar cache — isso
 * exige o `QueryClient`/router, que só existem depois do React montar. Por
 * isso o transporte apenas invoca um handler registrado em runtime; quem
 * registra (`useSessionExpiryRedirect`, usado uma única vez em
 * `src/routes/__root.tsx`) decide o que fazer (seção 3 do readme: "Trate
 * expiração durante a navegação e durante o checkout, preservando o
 * contexto para retomada").
 */
export type SessionExpiredHandler = (context: { requestUrl?: string }) => void

let handler: SessionExpiredHandler | null = null

export function setSessionExpiredHandler(next: SessionExpiredHandler | null): void {
  handler = next
}

/** Chamado pelo interceptor do Axios (`shared/api/http.ts`) a cada 401 `INVALID_SESSION`. */
export function notifySessionExpired(context: { requestUrl?: string } = {}): void {
  handler?.(context)
}
