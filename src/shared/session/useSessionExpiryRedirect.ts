import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { adoptExpiredSession, useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { setSessionExpiredHandler } from './session-expiry'

/**
 * Monta, uma única vez (`src/routes/__root.tsx`), o tratamento de expiração
 * de sessão "em tempo real" (readme §3: "Trate expiração durante a
 * navegação e durante o checkout, preservando o contexto para retomada").
 * Duas fontes alimentam o mesmo efeito:
 *
 * 1. **Ativa** — qualquer requisição autenticada (perfil, carteiras,
 *    carrinho, pedidos, etc.) responde 401 `INVALID_SESSION`. O interceptor
 *    do Axios (`shared/api/http.ts`) notifica `session-expiry.ts`, que
 *    chama o handler registrado aqui.
 * 2. **Passiva** — o próprio `useSessionQuery` (`refetchInterval: 30s`)
 *    descobre, sem nenhum request ter falhado, que a sessão virou `null`
 *    (ex.: cenário `sessionForceExpired` do painel de controle, ou a sessão
 *    simplesmente venceu) enquanto o usuário ficou parado numa tela privada
 *    sem navegar (nenhum `beforeLoad` roda nesse caso).
 *
 * Em ambos os casos, a reação é a mesma: `adoptExpiredSession` (limpar todo
 * o cache privado + desconectar o socket da sessão — mesma política de
 * `useLogoutMutation`, já que uma expiração é, na prática, um logout
 * involuntário) e então `router.invalidate()`, que re-executa o
 * `beforeLoad` da rota ATUAL. Se
 * essa rota for privada, `requireAuth` relança o `redirect` para `/login`
 * com `location.href` da própria página em que o usuário estava — é isso
 * que "preserva o contexto para retomada" sem duplicar a lista de rotas
 * privadas aqui: a decisão de "esta rota exige login" já mora inteiramente
 * em `requireAuth`/`beforeLoad`, este hook só força o guard a rodar de novo.
 */
export function useSessionExpiryRedirect(): void {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const wasAuthenticatedRef = useRef(false)
  const handledRef = useRef(false)

  useEffect(() => {
    if (session) {
      wasAuthenticatedRef.current = true
      handledRef.current = false
    }
  }, [session])

  useEffect(() => {
    function handleExpiry() {
      if (handledRef.current) return
      handledRef.current = true
      adoptExpiredSession(queryClient)
      void router.invalidate()
    }

    setSessionExpiredHandler(handleExpiry)

    return () => setSessionExpiredHandler(null)
  }, [router, queryClient])

  // Detecção passiva: a sessão virou `null` sem nenhum 401 observado (ver (2) acima).
  useEffect(() => {
    if (session === null && wasAuthenticatedRef.current && !handledRef.current) {
      handledRef.current = true
      wasAuthenticatedRef.current = false
      adoptExpiredSession(queryClient)
      void router.invalidate()
    }
  }, [session, queryClient, router])
}
