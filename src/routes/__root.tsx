import type { QueryClient } from '@tanstack/react-query'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { NotFoundState } from '@/components/not-found-state'
import { useSessionExpiryRedirect } from '@/shared/session/useSessionExpiryRedirect'

/**
 * Contexto do router: carrega o `QueryClient` (injetado em `main.tsx`) — ver
 * `ARCHITECTURE.md` §4 para a política de cache que ele implementa.
 * `requireAuth` (Fase 3, `src/shared/session/requireAuth.ts`) lê a sessão
 * real a partir deste mesmo `QueryClient` no `beforeLoad` de cada rota
 * privada.
 */
export interface RouterContext {
  queryClient: QueryClient
}

/**
 * Rota raiz (Task 1.1, `agent-shell`): monta o shell de navegação
 * (`AppShell`) em volta de toda a árvore de rotas e define o fallback de
 * "rota inexistente" (readme §4: "tratamento de rotas inexistentes e acesso
 * direto a qualquer tela prevista") — usado tanto quando nenhuma rota
 * casa com o caminho digitado quanto quando uma rota filha lança
 * `notFound()` explicitamente (ex.: NFT inexistente, Fase 4).
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFoundState />,
})

function RootLayout() {
  // Montado uma única vez para toda a árvore de rotas (Fase 3, `agent-auth`):
  // trata expiração de sessão detectada durante a navegação/checkout,
  // preservando o contexto para retomada — ver
  // `src/shared/session/useSessionExpiryRedirect.ts`.
  useSessionExpiryRedirect()

  return (
    <AppShell>
      <Outlet />
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
    </AppShell>
  )
}
