import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { queryClient } from '@/shared/query/queryClient'
import './index.css'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree, context: { queryClient } })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </StrictMode>,
  )
}

/**
 * Camada de mocks (seção 6: "ativada por configuração e estar disponível no
 * build de demonstração"). Os handlers em si (fixtures, cenários de
 * rede/falha, binding Socket.IO) são escopo da Fase 2 (`agent-mocks`) — aqui
 * só garantimos que, quando `VITE_ENABLE_MOCKS=true`, o worker está de pé
 * ANTES de renderizar a árvore React (nenhuma requisição deve escapar do
 * MSW por causa de uma corrida entre o primeiro render e o worker subindo).
 */
if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  import('@/features/mocks/browser').then(({ worker }) => worker.start({ onUnhandledFrame: 'bypass' }).then(renderApp))
} else {
  renderApp()
}
