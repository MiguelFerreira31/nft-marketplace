import './index.css'

async function renderApp() {
  const { renderApp: render } = await import('./app')
  render()
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
  void renderApp()
}
