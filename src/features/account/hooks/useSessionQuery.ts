import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { disconnectSessionSocket } from '@/features/realtime/client/session-socket'
import { queryKeys } from '@/shared/query/keys'
import type { LoginRequest, RegisterRequest, Session } from '@/shared/types'
import { sessionApi } from '../api/session.api'

/**
 * Opções de query únicas para a sessão, compartilhadas por `useSessionQuery`
 * (consumo reativo em componentes) e por `requireAuth` (consumo imperativo
 * no `beforeLoad` das rotas privadas, via `queryClient.ensureQueryData`) —
 * mesma `queryKey`/`queryFn`/`staleTime` nos dois lugares, para que os dois
 * caminhos leiam/escrevam exatamente a mesma entrada de cache (sem isso,
 * `requireAuth` poderia decidir com base em uma cópia desatualizada).
 *
 * `staleTime: 10s` (Task 0.3): precisa refletir expiração rápido. `refetchInterval: 30s`
 * complementa isso para o caso em que o usuário fica numa mesma tela privada
 * sem navegar (nenhum `beforeLoad` roda de novo) — sem isto, uma sessão que
 * expira enquanto a página está aberta só seria percebida na próxima
 * navegação ou no próximo 401 de outro recurso. `refetchIntervalInBackground: false`
 * (padrão) evita bater na API com a aba em segundo plano.
 */
export function sessionQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => sessionApi.current(signal),
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

export function useSessionQuery() {
  return useQuery(sessionQueryOptions())
}

/**
 * Ponto ÚNICO de "virar a página" para uma sessão nova (login, cadastro,
 * logout OU expiração detectada por `useSessionExpiryRedirect`) — todo
 * dado privado da sessão ANTERIOR precisa desaparecer do cache antes de
 * `nextSession` ser adotada, critério eliminatório da seção 11 ("exposição
 * de dados entre usuários"). O socket da sessão anterior (se existir) é
 * desconectado pelo mesmo motivo (nenhuma subscription sobrevive à troca).
 *
 * Importante (verificado manualmente nesta entrega): `queryClient.clear()`
 * removeria E recriaria a própria entrada da sessão por baixo do
 * `QueryObserver` ativo (`SiteHeader`, `useSessionExpiryRedirect`), e isso
 * deixava `useSessionQuery()` preso no último estado conhecido em vez de
 * refletir a mudança — só um refresh completo "destravava". Por isso aqui
 * SEMPRE: (1) `setQueryData` da sessão PRIMEIRO, para o observer já ativo
 * receber o novo valor diretamente, e só então (2) `removeQueries` com um
 * `predicate` que EXCLUI a própria key da sessão — isso remove 100% do
 * resto (favoritos, carrinho, perfil, carteiras, pedidos) sem tocar no
 * observer que já foi atualizado no passo 1.
 */
function adoptSession(queryClient: QueryClient, nextSession: Session | null) {
  disconnectSessionSocket()
  queryClient.setQueryData(queryKeys.session(), nextSession)
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'session',
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: LoginRequest) => sessionApi.login(payload),
    onSuccess: (session) => adoptSession(queryClient, session),
  })
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegisterRequest) => sessionApi.register(payload),
    onSuccess: (session) => adoptSession(queryClient, session),
  })
}

/**
 * Logout limpa TODO o cache privado (não só a sessão) e desconecta o socket
 * da sessão — critério eliminatório da seção 11. Reaproveita `adoptSession`
 * com `null` (ver o comentário ali para o porquê de não usar
 * `queryClient.clear()` diretamente).
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => sessionApi.logout(),
    onSuccess: () => adoptSession(queryClient, null),
  })
}

/**
 * Usado por `useSessionExpiryRedirect` quando a sessão expira durante a
 * navegação/checkout (seção 3 do readme) — mesma limpeza de logout, só que
 * disparada pela detecção de expiração, não por um clique explícito em
 * "Sair".
 */
export function adoptExpiredSession(queryClient: QueryClient) {
  adoptSession(queryClient, null)
}
