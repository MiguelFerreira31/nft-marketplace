import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { clearCheckoutAttempt } from '@/features/checkout/lib/checkout-attempt'
import { useOrderQuery } from '@/features/checkout/hooks/useOrderQuery'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
import { requireAuth } from '@/shared/session/requireAuth'
import type { OrderId } from '@/shared/types'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useParams() as { orderId: OrderId }
  const sessionQuery = useSessionQuery()
  const orderQuery = useOrderQuery(orderId)
  const order = orderQuery.data

  useEffect(() => {
    if (!order || order.status === 'pending' || !sessionQuery.data?.user.id) return
    clearCheckoutAttempt(sessionQuery.data.user.id, order.id)
  }, [order, sessionQuery.data?.user.id])

  if (orderQuery.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <p role="status">Carregando status do pedido…</p>
      </div>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <CatalogErrorState error={orderQuery.error} onRetry={() => orderQuery.refetch()} title="Não foi possível carregar o pedido" />
      </div>
    )
  }

  const statusLabel = order.status === 'pending' ? 'Pendente' : order.status === 'confirmed' ? 'Confirmado' : 'Recusado'

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {order.status === 'confirmed' ? 'Pedido confirmado' : order.status === 'refused' ? 'Pagamento recusado' : 'Pedido em processamento'}
        </h1>
        <p role="status" aria-live="polite" className="mt-2 text-sm text-muted-foreground">
          Status: {statusLabel}.
          {order.status === 'pending' ? ' Aguardando a atualização do pagamento; esta página será atualizada automaticamente.' : ''}
          {order.status === 'refused' ? ' Os itens continuam no seu carrinho e você pode tentar novamente.' : ''}
        </p>
      </header>

      <section data-testid="order-receipt" aria-label="Recibo do pedido" className="flex flex-col gap-5 rounded-xl border border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-sm text-muted-foreground">Pedido</p>
            <p className="break-all font-medium">{order.id}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">Criado em</p>
            <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString('pt-BR')}</time>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{order.status === 'confirmed' ? 'Itens comprados' : 'Itens do pedido'}</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.editionId} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                </div>
                <dl className="text-right text-sm">
                  <div>
                    <dt className="sr-only">Preço unitário</dt>
                    <dd>{item.unitPriceEth} ETH cada</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Subtotal do item</dt>
                    <dd className="font-medium">{item.subtotalEth} ETH</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>

        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{order.subtotalEth} ETH</dd>
          </div>
          {order.discountEth !== '0' ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd>-{order.discountEth} ETH</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Taxa de rede</dt>
            <dd>{order.networkFeeEth} ETH</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-semibold">
            <dt>{order.status === 'confirmed' ? 'Total pago' : 'Total do pedido'}</dt>
            <dd>{order.totalEth} ETH</dd>
          </div>
        </dl>

        <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Carteira</dt>
            <dd className="break-all font-medium">{order.walletId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rede</dt>
            <dd className="font-medium">{order.network}</dd>
          </div>
          {order.status === 'confirmed' && order.transactionRef ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Referência da transação simulada</dt>
              <dd className="break-all font-medium">{order.transactionRef}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        {order.status === 'refused' ? (
          <Button asChild>
            <Link to="/checkout">Tentar outra vez</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to="/cart">Ver carrinho</Link>
        </Button>
      </div>
    </div>
  )
}
