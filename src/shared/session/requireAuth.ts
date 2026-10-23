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
 * `context.queryClient.ensureQueryData(sessionQueryOptions())` reaproveita a
 * MESMA `queryKey`/`queryFn`/`staleTime` que `useSessionQuery` usa em
 * componentes — se o cache já tem uma sessão fresca (ex.: já resolvida no
 * boot da rota raiz), não dispara outra requisição; caso contrário, aguarda
 * o `GET /session` resolver antes de decidir (cobre tanto acesso direto por
 * URL colada quanto refresh — a sessão simulada sobrevive porque o "banco"
 * do MSW é persistido em `localStorage`, não depende de nada no cliente).
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
  const session = await context.queryClient.ensureQueryData(sessionQueryOptions())
  if (!session) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    })
  }
}
