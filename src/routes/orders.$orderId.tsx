import { createFileRoute } from '@tanstack/react-router'
import type { OrderId } from '@/shared/types'
import { requireAuth } from '@/shared/session/requireAuth'

/**
 * Confirmação de pedido (readme §3): resultado, identificação da
 * transação, itens, taxas e total. Rota privada — pedidos pertencem a um
 * usuário autenticado (readme §3 "Conta e sessão"). Acesso direto por
 * `$orderId` é intencional: o recibo (Fase 7) precisa sobreviver a
 * refresh/reconexão enquanto o pedido estiver `pending` (readme §7).
 */
export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useParams() as { orderId: OrderId }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Confirmação do pedido</h1>
      <p className="text-sm text-muted-foreground">
        Recibo (itens, taxas, total e referência de transação) do pedido{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">{orderId}</code> chega na Fase 7
        (`agent-checkout`). Estados pendente/confirmado/recusado também são dessa fase.
      </p>
    </div>
  )
}
