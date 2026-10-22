import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/shared/session/requireAuth'

/**
 * Pagamento (readme §3): dados do colecionador, seleção de carteira e rede,
 * revisão e envio do pedido. Rota privada (readme §3 "Conta e sessão":
 * "Checkout... exigem autenticação") — `beforeLoad` redireciona para
 * `/login` preservando esta URL em `search.redirect` quando deslogado (ver
 * `requireAuth`).
 */
export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ location }) => requireAuth(location),
  component: CheckoutPage,
})

function CheckoutPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pagamento</h1>
      <p className="text-sm text-muted-foreground">
        Dados do colecionador, seleção de carteira/rede, revisão e envio do pedido chegam na Fase 7
        (`agent-checkout`). Esta rota só é alcançável autenticado.
      </p>
    </div>
  )
}
