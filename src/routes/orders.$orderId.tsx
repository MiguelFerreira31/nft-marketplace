import { createFileRoute } from '@tanstack/react-router'
import type { OrderId } from '@/shared/types'
import { useOrderQuery } from '@/features/checkout/hooks/useOrderQuery'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
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
  const orderQuery = useOrderQuery(orderId)

  if (orderQuery.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <p role="status">Carregando status do pedido…</p>
      </div>
    )
  }

  if (orderQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <CatalogErrorState error={orderQuery.error} onRetry={() => orderQuery.refetch()} title="Não foi possível carregar o pedido" />
      </div>
    )
  }

  const order = orderQuery.data

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{order.status === 'confirmed' ? 'Pedido confirmado' : 'Pedido'}</h1>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        Status: {order.status === 'pending' ? 'Pendente' : order.status === 'confirmed' ? 'Confirmado' : 'Recusado'}.
        {order.status === 'pending' ? ' Aguardando a atualização do pagamento.' : ''}
      </p>
      <p className="text-sm text-muted-foreground">
        Pedido <code className="rounded bg-muted px-1 py-0.5 text-xs">{order.id}</code> · versão {order.version}
      </p>
      <p className="text-sm text-muted-foreground">O recibo detalhado será exibido na Fase 7.</p>
    </div>
  )
}
