import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { CartTotals } from '@/features/cart/components/cart-totals'
import { useCartQuery } from '@/features/cart/hooks/useCartQuery'
import { useQuoteQuery } from '@/features/cart/hooks/useQuoteQuery'
import { useRealtimeNftEvents } from '@/features/realtime/hooks/useRealtimeNftEvents'
import { requireAuth } from '@/shared/session/requireAuth'

/**
 * Pagamento (readme §3): dados do colecionador, seleção de carteira e rede,
 * revisão e envio do pedido. Rota privada (readme §3 "Conta e sessão":
 * "Checkout... exigem autenticação") — `beforeLoad` redireciona para
 * `/login` preservando esta URL em `search.redirect` quando deslogado (ver
 * `requireAuth`).
 */
export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: CheckoutPage,
})

function CheckoutPage() {
  const sessionQuery = useSessionQuery()
  const userId = sessionQuery.data?.user.id ?? 'guest'
  const cartQuery = useCartQuery(userId)
  const cart = cartQuery.data
  const quoteQuery = useQuoteQuery(cart?.items.length ? cart.id : undefined)
  const realtimeUpdates = useRealtimeNftEvents()
  const [reviewedToken, setReviewedToken] = useState<string | null>(null)
  const quote = quoteQuery.data
  const relevantUpdate = (realtimeUpdates.data ?? []).findLast(
    ({ event, cartId }) => cartId === cart?.id && cart.items.some((item) => item.nftId === event.resourceId),
  )
  const reviewToken = quote ? `${quote.quoteVersion}:${relevantUpdate?.event.id ?? ''}` : ''
  const hasUnavailableItem =
    (cart?.items.some((item) => item.quantity > item.availableQuantity) ?? false) ||
    (quote?.items.some((item) => !item.available) ?? false)
  const canReviewQuote = Boolean(quote) && !quoteQuery.isFetching && !quoteQuery.isError && !hasUnavailableItem
  const quoteReviewed = Boolean(reviewToken) && reviewedToken === reviewToken

  function handleReviewQuote() {
    if (canReviewQuote) setReviewedToken(reviewToken)
  }

  if (!cartQuery.isPending && cart?.items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Pagamento</h1>
        <p role="status">Seu carrinho está vazio.</p>
        <Button asChild variant="outline">
          <Link to="/cart">Voltar ao carrinho</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pagamento</h1>
      <p className="text-sm text-muted-foreground">Confira e aceite a cotação mais recente antes de confirmar o pedido.</p>

      {hasUnavailableItem ? (
        <Alert variant="destructive">
          <AlertTitle>Confirmação bloqueada</AlertTitle>
          <AlertDescription>Ajuste ou remova os itens indisponíveis no carrinho antes de continuar.</AlertDescription>
        </Alert>
      ) : quoteReviewed ? (
        <Alert>
          <AlertTitle>Cotação revisada</AlertTitle>
          <AlertDescription>
            Você revisou a cotação {quote?.quoteVersion}. Os dados de pagamento e o envio do pedido pertencem à Fase 7.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Confirmação bloqueada</AlertTitle>
          <AlertDescription>
            {relevantUpdate
              ? 'O preço ou a disponibilidade do carrinho mudou. Revise e aceite a cotação atualizada antes de confirmar.'
              : 'Revise e aceite a cotação atual antes de confirmar o pedido.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <CartTotals
          quote={quote}
          isLoading={cartQuery.isPending || quoteQuery.isPending}
          isError={cartQuery.isError || quoteQuery.isError}
          error={cartQuery.error ?? quoteQuery.error}
          onRetry={() => {
            void cartQuery.refetch().then(() => quoteQuery.refetch())
          }}
        />
        <Button type="button" onClick={handleReviewQuote} disabled={!canReviewQuote || quoteReviewed}>
          {quoteReviewed ? 'Cotação revisada' : 'Revisar e aceitar cotação atual'}
        </Button>
        {hasUnavailableItem ? (
          <p className="text-sm text-destructive">A cotação não pode ser aceita enquanto houver itens indisponíveis.</p>
        ) : null}
      </div>

      <Button asChild variant="outline">
        <Link to="/cart">Voltar ao carrinho</Link>
      </Button>
    </div>
  )
}
