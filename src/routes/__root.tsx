import type { QueryClient } from '@tanstack/react-query'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'

/**
 * Contexto do router. Hoje só carrega o `QueryClient` (injetado em
 * `main.tsx`) — ver `ARCHITECTURE.md` §4 para a política de cache que ele
 * implementa. A sessão privada usa `mockSession`/`requireAuth`
 * diretamente nas rotas (não via contexto) — ver
 * `src/shared/session/mockSession.ts` para o porquê de ser provisório.
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
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
    </AppShell>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço acessado não corresponde a nenhuma tela do marketplace. Confira a URL ou volte ao início.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
