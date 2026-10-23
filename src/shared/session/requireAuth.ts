import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { sessionQueryOptions } from '@/features/account/hooks/useSessionQuery'

/**
 * Guard de rota privada real (Task 3.1 — readme §3 "Conta e sessão":
 * checkout, perfil, carteiras e pedidos exigem autenticação).
 *
 * Usado no `beforeLoad` de cada rota privada:
 *
 * ```ts
 * export const Route = createFileRoute('/checkout')({
 *   beforeLoad: ({ context, location }) => requireAuth({ context, location }),
 *   component: CheckoutPage,
 * })
 * ```
 *
 * `fetchQuery(sessionQueryOptions())` reaproveita a MESMA `queryKey`/
 * `queryFn`/`staleTime` que `useSessionQuery`; quando a sessão está stale,
 * aguarda o `GET /session` resolver antes de admitir acesso (não usa
 * `ensureQueryData` com revalidação em background, que poderia liberar a
 * rota com a sessão antiga).
 *
 * Preserva o destino original em `search.redirect` (`location.href`, que já
 * inclui path + query string) para a tela de login retomar o fluxo após
 * autenticar — ver `src/routes/login.tsx`. O mesmo guard é re-executado por
 * `router.invalidate()` quando a sessão expira DURANTE a navegação/checkout
 * (ver `useSessionExpiryRedirect.ts`), lançando o mesmo redirect com a URL
 * atual naquele momento.
 */
export async function requireAuth({
  context,
  location,
}: {
  context: { queryClient: QueryClient }
  location: { href: string }
}): Promise<void> {
  const session = await context.queryClient.fetchQuery(sessionQueryOptions())
  if (!session) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    })
  }
}
