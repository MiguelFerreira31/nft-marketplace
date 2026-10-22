/**
 * Sessão mock da Fase 1 (Task 1.1 — `agent-shell`).
 * ------------------------------------------------------------------
 * PROVISÓRIO: existe apenas para permitir testar os *guards* de rota
 * privada (checkout, confirmação de pedido, perfil, carteiras) antes de a
 * Fase 3 (`agent-auth`) existir. Não é a sessão real do produto:
 *
 * - não fala com a API (nem via Axios, nem via `useSessionQuery`);
 * - não valida credenciais, não trata expiração, não limpa o cache do
 *   TanStack Query no logout (isso é authority de `useLogoutMutation`,
 *   que já existe em `features/account/hooks/useSessionQuery.ts` e será
 *   conectado de verdade pela Fase 3);
 * - guarda só um usuário "de brinquedo" em `localStorage`, para sobreviver
 *   a refresh o suficiente para QA manual dos guards de rota.
 *
 * `agent-auth` deve SUBSTITUIR este módulo (e os imports em
 * `src/routes/**`) pela sessão real baseada em `useSessionQuery`/
 * `useLoginMutation`/`useLogoutMutation` + `beforeLoad` lendo do
 * `QueryClient` (ou de um contexto de router equivalente). Nada aqui deve
 * sobreviver à Fase 3.
 */

const STORAGE_KEY = 'nft-marketplace:mock-session'
const EVENT_NAME = 'nft-marketplace:mock-session-change'

export interface MockSessionUser {
  id: string
  name: string
  email: string
}

/**
 * Cache do último par (string crua do `localStorage`, objeto parseado).
 * `useSyncExternalStore` (`useMockSession.ts`) exige que `getSnapshot`
 * devolva a MESMA referência entre chamadas enquanto o valor não mudou —
 * sem este cache, `JSON.parse` criaria um objeto novo a cada leitura e o
 * React entraria em loop de re-render infinito.
 */
let lastSnapshot: { raw: string | null; value: MockSessionUser | null } = { raw: null, value: null }

function readSession(): MockSessionUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === lastSnapshot.raw) return lastSnapshot.value
  let value: MockSessionUser | null = null
  try {
    value = raw ? (JSON.parse(raw) as MockSessionUser) : null
  } catch {
    value = null
  }
  lastSnapshot = { raw, value }
  return value
}

function writeSession(user: MockSessionUser | null) {
  if (typeof window === 'undefined') return
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  window.dispatchEvent(new Event(EVENT_NAME))
}

export const mockSession = {
  /** Lê o estado atual direto do `localStorage` — seguro para usar fora do React (ex.: `beforeLoad`). */
  get(): MockSessionUser | null {
    return readSession()
  },
  isAuthenticated(): boolean {
    return readSession() !== null
  },
  /** Login "de brinquedo": qualquer dado vira uma sessão válida, sem round-trip de rede. */
  login(user: MockSessionUser) {
    writeSession(user)
  },
  logout() {
    writeSession(null)
  },
  /** Para `useSyncExternalStore` — reage a login/logout desta aba e a mudanças de `localStorage` em outra aba. */
  subscribe(callback: () => void) {
    window.addEventListener(EVENT_NAME, callback)
    window.addEventListener('storage', callback)
    return () => {
      window.removeEventListener(EVENT_NAME, callback)
      window.removeEventListener('storage', callback)
    }
  },
}
