import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { LoginRequest, RegisterRequest } from '@/shared/types'
import { sessionApi } from '../api/session.api'

/**
 * Sessão é consultada uma vez no boot da aplicação e mantida fresca via
 * `staleTime` curto — ela precisa refletir expiração detectada pelo
 * interceptor Axios (`INVALID_SESSION`) o mais rápido possível (seção 3:
 * "Trate expiração durante a navegação e durante o checkout").
 */
export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => sessionApi.current(signal),
    staleTime: 10_000,
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: LoginRequest) => sessionApi.login(payload),
    onSuccess: (session) => queryClient.setQueryData(queryKeys.session(), session),
  })
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegisterRequest) => sessionApi.register(payload),
    onSuccess: (session) => queryClient.setQueryData(queryKeys.session(), session),
  })
}

/**
 * Logout limpa TODO o cache (não só a sessão) — critério eliminatório da
 * seção 11 ("exposição de dados entre usuários"). `agent-auth` (Fase 3) usa
 * este hook e complementa com o encerramento das subscriptions Socket.IO da
 * sessão anterior (ver `ARCHITECTURE.md`, política de sessão/realtime).
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => sessionApi.logout(),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
