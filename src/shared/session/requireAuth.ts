import { redirect } from '@tanstack/react-router'
import { mockSession } from './mockSession'

/**
 * Guard de rota privada (Task 1.1 — readme §3 "Conta e sessão": checkout,
 * perfil, carteiras, favoritos e pedidos exigem autenticação).
 *
 * Usado no `beforeLoad` de cada rota privada:
 *
 * ```ts
 * export const Route = createFileRoute('/checkout')({
 *   beforeLoad: ({ location }) => requireAuth(location),
 *   component: CheckoutPage,
 * })
 * ```
 *
 * Preserva o destino original em `search.redirect` (`location.href`, que já
 * inclui path + query string) para a tela de login retomar o fluxo após
 * autenticar — ver `src/routes/login.tsx`.
 *
 * Provisório: depende de `mockSession` (Fase 1). A Fase 3 (`agent-auth`)
 * deve trocar a checagem por sessão real (ex.: ler do cache do
 * `QueryClient`/contexto de router) mantendo a mesma assinatura de guard.
 */
export function requireAuth(location: { href: string }) {
  if (!mockSession.isAuthenticated()) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    })
  }
}
