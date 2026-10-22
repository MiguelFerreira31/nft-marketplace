import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'

/**
 * Root route mínima da Fase 0: só garante que o router/dev-server sobem.
 * Shell, layout responsivo, tokens visuais e proteção de rotas privadas são
 * escopo da Task 1.1/1.2 (`agent-shell`).
 */
export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
    </>
  ),
})
