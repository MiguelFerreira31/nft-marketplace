import { createFileRoute, Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
import { CartEmptyState } from '@/features/cart/components/cart-empty-state'
import { CartItemRow } from '@/features/cart/components/cart-item-row'
import { CartSummarySkeleton } from '@/features/cart/components/cart-summary-skeleton'
import { CartTotals } from '@/features/cart/components/cart-totals'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { useCartQuery } from '@/features/cart/hooks/useCartQuery'
import { useQuoteQuery } from '@/features/cart/hooks/useQuoteQuery'
import { useRealtimeNftEvents } from '@/features/realtime/hooks/useRealtimeNftEvents'

/**
 * Carrinho de NFTs (readme §3): edição de quantidades, remoção, cupom e
 * resumo de valores. Não é uma rota privada — readme §3 "Conta e sessão"
 * só exige autenticação para checkout/perfil/carteiras/favoritos/pedidos, e
 * §3 "Carrinho" pede explicitamente persistir "os itens do visitante ao
 * autenticar" (ou seja, o carrinho de visitante precisa existir sem login).
 */
export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const sessionQuery = useSessionQuery()
  const userId = sessionQuery.data?.user.id ?? 'guest'
  const cartQuery = useCartQuery(userId)
  const cart = cartQuery.data
  const realtimeUpdates = useRealtimeNftEvents()
  const hasItems = Boolean(cart && cart.items.length > 0)
  const quoteQuery = useQuoteQuery(hasItems ? cart?.id : undefined)
  const isInitialLoading = sessionQuery.isPending || cartQuery.isPending
  const isRefreshing = cartQuery.isFetching || quoteQuery.isFetching
  const hasUnavailableItem = cart?.items.some((item) => item.quantity > item.availableQuantity) ?? false
  const hasRealtimeCartUpdate =
    Boolean(cart) &&
    (realtimeUpdates.data ?? []).some(
      ({ event, cartId }) => cartId === cart?.id && cart.items.some((item) => item.nftId === event.resourceId),
    )

  function handleRefresh() {
    void (async () => {
      const { data: refreshedCart } = await cartQuery.refetch()
      if (refreshedCart?.items.length) await quoteQuery.refetch()
    })()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Carrinho</h1>
        {!isInitialLoading && cart && cart.items.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw aria-hidden="true" className={cn('size-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Atualizando…' : 'Atualizar preços e disponibilidade'}
          </Button>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {isRefreshing ? 'Atualizando carrinho…' : ''}
      </p>
      {hasRealtimeCartUpdate ? (
        <p role="status" aria-live="polite" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          O preço ou a disponibilidade de um NFT do carrinho mudou. O resumo foi atualizado com a cotação mais recente.
        </p>
      ) : null}

      {isInitialLoading ? (
        <div className="rounded-xl border border-border p-4">
          <CartSummarySkeleton />
        </div>
      ) : sessionQuery.isError ? (
        <CatalogErrorState
          error={sessionQuery.error}
          onRetry={() => sessionQuery.refetch()}
          title="Não foi possível verificar sua sessão"
        />
      ) : cartQuery.isError ? (
        <CatalogErrorState error={cartQuery.error} onRetry={() => cartQuery.refetch()} title="Não foi possível carregar o carrinho" />
      ) : !cart || cart.items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,340px)]">
          <ul className="flex flex-col gap-4">
            {cart.items.map((item) => (
              <CartItemRow key={item.id} item={item} userId={userId} onNeedsRefresh={() => cartQuery.refetch()} />
            ))}
          </ul>

          <aside className="flex flex-col gap-6 self-start rounded-xl border border-border p-4">
            <CouponForm
              cartId={cart.id}
              couponCode={quoteQuery.data ? quoteQuery.data.couponCode : cart.couponCode}
              couponDiscountPercent={quoteQuery.data ? quoteQuery.data.couponDiscountPercent : null}
            />

            <CartTotals
              quote={quoteQuery.data}
              isLoading={quoteQuery.isPending}
              isError={quoteQuery.isError}
              error={quoteQuery.error}
              onRetry={() => quoteQuery.refetch()}
            />

            <CheckoutCta canProceed={!quoteQuery.isPending && !quoteQuery.isError && !hasUnavailableItem} />
            {hasUnavailableItem ? (
              <p className="text-xs text-destructive">
                Ajuste as quantidades indisponíveis antes de prosseguir para o pagamento.
              </p>
            ) : null}
          </aside>
        </div>
      )}

      <div>
        <Button asChild variant="outline">
          <Link to="/">Continuar explorando</Link>
        </Button>
      </div>
    </div>
  )
}

function CheckoutCta({ canProceed }: { canProceed: boolean }) {
  if (!canProceed) {
    return (
      <Button type="button" disabled>
        Ir para pagamento
      </Button>
    )
  }

  return (
    <Button asChild>
      <Link to="/checkout">Ir para pagamento</Link>
    </Button>
  )
}
