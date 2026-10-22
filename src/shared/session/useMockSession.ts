import { useSyncExternalStore } from 'react'
import { mockSession } from './mockSession'

/**
 * Hook reativo sobre a sessão mock (ver `mockSession.ts` para o porquê de
 * ser provisório). Usado pelo shell (header) para alternar
 * Login/Cadastro ↔ Perfil/Carteiras/Sair sem precisar de prop drilling.
 */
export function useMockSession() {
  const user = useSyncExternalStore(mockSession.subscribe, mockSession.get, () => null)
  return {
    user,
    isAuthenticated: user !== null,
  }
}
