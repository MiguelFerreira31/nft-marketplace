import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useProfileQuery } from '@/features/account/hooks/useProfileQuery'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { useWalletsQuery } from '@/features/account/hooks/useWalletsQuery'
import { CartTotals } from '@/features/cart/components/cart-totals'
import { useCartQuery } from '@/features/cart/hooks/useCartQuery'
import { useQuoteQuery } from '@/features/cart/hooks/useQuoteQuery'
import { useCreateOrderMutation } from '@/features/checkout/hooks/useCreateOrderMutation'
import { clearCheckoutAttempt, readCheckoutAttempt, saveCheckoutAttempt, type CheckoutAttempt } from '@/features/checkout/lib/checkout-attempt'
import { useRealtimeNftEvents } from '@/features/realtime/hooks/useRealtimeNftEvents'
import type { RealtimeCartNftUpdate } from '@/features/realtime/hooks/useRealtimeNftEvents'
import { getApiErrorBody } from '@/shared/api/http'
import { createIdempotencyKey } from '@/shared/api/idempotency'
import { queryKeys } from '@/shared/query/keys'
import type { CreateOrderRequest, UserId } from '@/shared/types'
import type { Quote } from '@/shared/types'
import { requireAuth } from '@/shared/session/requireAuth'

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: CheckoutPage,
})

function checkoutReviewToken(
  cartId: string,
  quote: Quote,
  eventId: string,
  walletId: string,
  network: string,
) {
  return JSON.stringify([
    cartId,
    quote.quoteVersion,
    quote.couponCode,
    quote.couponDiscountPercent,
    quote.subtotalEth,
    quote.discountEth,
    quote.networkFeeEth,
    quote.totalEth,
    quote.items.map((item) => [item.editionId, item.quantity, item.unitPriceEth, item.subtotalEth, item.available]),
    eventId,
    walletId,
    network,
  ])
}

function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = Route.useRouteContext().queryClient
  const sessionQuery = useSessionQuery()
  const userId = sessionQuery.data?.user.id
  const profileQuery = useProfileQuery(userId)
  const walletsQuery = useWalletsQuery(userId)
  const cartQuery = useCartQuery(userId ?? 'guest')
  const cart = cartQuery.data
  const quoteQuery = useQuoteQuery(cart?.items.length ? cart.id : undefined)
  const realtimeUpdates = useRealtimeNftEvents()
  const createOrderMutation = useCreateOrderMutation()
  const [reviewedToken, setReviewedToken] = useState<string | null>(null)
  const [walletSelection, setWalletSelection] = useState('')
  const [networkSelection, setNetworkSelection] = useState('')
  const [connection, setConnection] = useState<'disconnected' | 'connected' | 'rejected'>('disconnected')
  const [preflightPending, setPreflightPending] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)
  const [attemptState, setAttemptState] = useState<{ userId: UserId; value: CheckoutAttempt | null } | null>(null)
  const submissionLock = useRef(false)
  const attempt = userId
    ? attemptState?.userId === userId
      ? attemptState.value
      : readCheckoutAttempt(userId)
    : null

  useEffect(() => {
    if (!userId || !attempt?.orderId) return
    void navigate({ to: '/orders/$orderId', params: { orderId: attempt.orderId } })
  }, [attempt?.orderId, navigate, userId])

  const quote = quoteQuery.data
  const selectedWalletId = (attempt?.payload.walletId ?? walletSelection) || walletsQuery.data?.items[0]?.id || ''
  const selectedWallet = walletsQuery.data?.items.find((wallet) => wallet.id === selectedWalletId)
  const networks = selectedWallet ? [selectedWallet.network] : []
  const selectedNetwork = (attempt?.payload.network ?? networkSelection) || selectedWallet?.network || ''
  const relevantUpdate = (realtimeUpdates.data ?? []).findLast(
    ({ event, cartId }) => cartId === cart?.id && cart.items.some((item) => item.nftId === event.resourceId),
  )
  const reviewToken =
    quote && cart
      ? checkoutReviewToken(cart.id, quote, relevantUpdate?.event.id ?? '', selectedWalletId, selectedNetwork)
      : ''
  const quoteReviewed = Boolean(reviewToken) && reviewedToken === reviewToken
  const hasUnavailableItem =
    (cart?.items.some((item) => item.quantity > item.availableQuantity) ?? false) ||
    (quote?.items.some((item) => !item.available) ?? false)
  const canReviewQuote = Boolean(quote) && !quoteQuery.isFetching && !quoteQuery.isError && !hasUnavailableItem
  const isRecovering = Boolean(attempt && !attempt.orderId)
  const isProcessing = preflightPending || createOrderMutation.isPending
  const isAttemptLoaded = Boolean(userId)

  function handleReviewQuote() {
    if (!canReviewQuote) return
    setSubmissionMessage(null)
    setReviewedToken(reviewToken)
  }

  async function handlePurchase() {
    if (
      !userId ||
      (!isRecovering && (!selectedWallet || !selectedNetwork)) ||
      submissionLock.current ||
      isProcessing ||
      connection !== 'connected'
    ) return
    submissionLock.current = true
    setSubmissionMessage(null)
    setPreflightPending(true)

    try {
      let nextAttempt = attempt && !attempt.orderId ? attempt : null
      if (!nextAttempt) {
        if (!selectedWallet || !selectedNetwork) {
          setSubmissionMessage('Selecione uma carteira e uma rede antes de continuar.')
          return
        }
        const refreshedCart = await cartQuery.refetch({ throwOnError: true })
        const latestCart = refreshedCart.data
        if (!latestCart || latestCart.items.length === 0 || latestCart.id !== cart?.id) {
          setSubmissionMessage('O carrinho mudou. Confira os itens antes de iniciar outra compra.')
          setReviewedToken(null)
          return
        }

        const refreshedQuote = await quoteQuery.refetch({ throwOnError: true })
        const latestQuote = refreshedQuote.data
        const currentUpdates =
          queryClient.getQueryData<RealtimeCartNftUpdate[]>(queryKeys.realtime.nftEvents()) ?? realtimeUpdates.data ?? []
        const latestUpdate = currentUpdates.findLast(
          ({ event, cartId: updateCartId }) =>
            updateCartId === latestCart.id && latestCart.items.some((item) => item.nftId === event.resourceId),
        )
        const latestReviewToken =
          latestQuote && latestCart
            ? checkoutReviewToken(latestCart.id, latestQuote, latestUpdate?.event.id ?? '', selectedWallet.id, selectedNetwork)
            : ''

        if (
          !latestQuote ||
          latestReviewToken !== reviewedToken ||
          latestQuote.items.some((item) => !item.available) ||
          latestCart.items.some((item) => item.quantity > item.availableQuantity)
        ) {
          setSubmissionMessage('A cotação mudou desde sua revisão. Revise e aceite os valores atualizados antes de pagar.')
          setReviewedToken(null)
          return
        }

        const payload: CreateOrderRequest = {
          cartId: latestCart.id,
          quoteVersion: latestQuote.quoteVersion,
          walletId: selectedWallet.id,
          network: selectedNetwork,
        }
        nextAttempt = { payload, idempotencyKey: createIdempotencyKey() }
        saveCheckoutAttempt(userId, nextAttempt)
        setAttemptState({ userId, value: nextAttempt })
      }

      setPreflightPending(false)
      const order = await createOrderMutation.mutateAsync({
        payload: nextAttempt.payload,
        idempotencyKey: nextAttempt.idempotencyKey,
      })
      const completedAttempt = { ...nextAttempt, orderId: order.id }
      saveCheckoutAttempt(userId, completedAttempt)
      setAttemptState({ userId, value: completedAttempt })
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    } catch (error) {
      const apiError = getApiErrorBody(error)
      if (apiError?.code === 'CONFLICT' && apiError.reason === 'STOCK_UNAVAILABLE') {
        clearCheckoutAttempt(userId)
        setAttemptState({ userId, value: null })
        setReviewedToken(null)
        setSubmissionMessage('O preço ou a disponibilidade mudou. Revise a cotação atual para iniciar uma nova tentativa.')
        await cartQuery.refetch()
        await quoteQuery.refetch()
      } else if (apiError?.code === 'CONFLICT' && apiError.reason === 'IDEMPOTENCY_KEY_MISMATCH') {
        clearCheckoutAttempt(userId)
        setAttemptState({ userId, value: null })
        setReviewedToken(null)
        setSubmissionMessage('Esta chave já pertence a outro pedido. Confira e aceite a cotação atual para iniciar uma nova tentativa.')
      } else if (apiError && apiError.code !== 'TRANSIENT_ERROR') {
        setSubmissionMessage(apiError.message)
      } else {
        setSubmissionMessage(
          'Não foi possível confirmar a resposta do pedido. Sua compra permanece no carrinho; tente novamente para recuperar a mesma tentativa.',
        )
      }
    } finally {
      setPreflightPending(false)
      submissionLock.current = false
    }
  }

  if (!isAttemptLoaded || sessionQuery.isPending || cartQuery.isPending || profileQuery.isPending || walletsQuery.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <h1 className="text-2xl font-semibold">Pagamento</h1>
        <p role="status">Carregando seus dados e a cotação…</p>
      </div>
    )
  }

  if (sessionQuery.isError || cartQuery.isError || profileQuery.isError || walletsQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Pagamento</h1>
        <Alert variant="destructive">
          <AlertTitle>Não foi possível preparar o pagamento</AlertTitle>
          <AlertDescription>Verifique sua sessão, perfil, carteira e carrinho e tente novamente.</AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void Promise.all([
              sessionQuery.refetch(),
              cartQuery.refetch(),
              profileQuery.refetch(),
              walletsQuery.refetch(),
            ])
          }}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if ((!cart || cart.items.length === 0) && !isRecovering) {
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

  const recoveryWallet = walletsQuery.data?.items.find((wallet) => wallet.id === attempt?.payload.walletId)
  const readyToPurchase = isRecovering
    ? connection === 'connected' && !isProcessing
    : quoteReviewed && connection === 'connected' && !hasUnavailableItem && !isProcessing

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">Confira quem paga, escolha a carteira e aprove a cotação antes de criar o pedido.</p>
      </div>

      {isRecovering ? (
        <Alert>
          <AlertTitle>Tentativa de compra aguardando resposta</AlertTitle>
          <AlertDescription>
            A resposta anterior pode ter expirado. Retomar usa a mesma chave e os mesmos dados, sem criar uma compra duplicada.
          </AlertDescription>
        </Alert>
      ) : null}

      {submissionMessage ? (
        <Alert variant={submissionMessage.includes('mudou') ? 'destructive' : 'default'}>
          <AlertTitle>Pagamento não enviado</AlertTitle>
          <AlertDescription>{submissionMessage}</AlertDescription>
        </Alert>
      ) : null}

      {attempt && !attempt.orderId && createOrderMutation.isError ? (
        <Alert variant="destructive">
          <AlertDescription>O pedido ainda não foi recuperado. Você pode tentar novamente com a mesma chave de idempotência.</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="collector-heading" className="rounded-xl border border-border p-4">
            <h2 id="collector-heading" className="text-lg font-semibold">Dados do colecionador</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{profileQuery.data?.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="font-medium">{profileQuery.data?.email}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="wallet-heading" className="flex flex-col gap-4 rounded-xl border border-border p-4">
            <div>
              <h2 id="wallet-heading" className="text-lg font-semibold">Carteira e rede</h2>
              <p className="mt-1 text-sm text-muted-foreground">A conexão é simulada; nenhuma extensão ou transação real é solicitada.</p>
            </div>

            {walletsQuery.data?.items.length ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="checkout-wallet">Carteira cadastrada</Label>
                    <select
                      id="checkout-wallet"
                      className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                      value={selectedWalletId}
                      disabled={Boolean(attempt)}
                      onChange={(event) => {
                        const nextWallet = walletsQuery.data?.items.find((wallet) => wallet.id === event.target.value)
                        setWalletSelection(event.target.value)
                        setNetworkSelection(nextWallet?.network ?? '')
                        setConnection('disconnected')
                      }}
                    >
                      {walletsQuery.data.items.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.label ?? (wallet.kind === 'primary' ? 'Carteira principal' : 'Carteira secundária')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="checkout-network">Rede da carteira</Label>
                    <select
                      id="checkout-network"
                      className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                      value={selectedNetwork}
                      disabled={Boolean(attempt)}
                      onChange={(event) => {
                        setNetworkSelection(event.target.value)
                        setConnection('disconnected')
                      }}
                    >
                      {networks.map((network) => (
                        <option key={network} value={network}>{network}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">{isRecovering ? recoveryWallet?.label ?? 'Carteira da tentativa' : selectedWallet?.label ?? 'Carteira selecionada'}</p>
                  <p className="break-all font-medium">{isRecovering ? recoveryWallet?.address ?? attempt?.payload.walletId : selectedWallet?.address}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {connection === 'connected' ? (
                    <Button type="button" variant="outline" onClick={() => setConnection('disconnected')}>Desconectar carteira</Button>
                  ) : (
                    <>
                      <Button type="button" onClick={() => setConnection('connected')}>Conectar carteira</Button>
                      <Button type="button" variant="outline" onClick={() => setConnection('rejected')}>Recusar conexão</Button>
                    </>
                  )}
                </div>
                <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                  {connection === 'connected'
                    ? `Carteira conectada em ${isRecovering ? attempt?.payload.network : selectedNetwork}.`
                    : connection === 'rejected'
                      ? 'Conexão recusada. Tente conectar novamente ou escolha outra carteira.'
                      : 'Carteira desconectada.'}
                </p>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Nenhuma carteira cadastrada</AlertTitle>
                <AlertDescription>Cadastre uma carteira antes de continuar.</AlertDescription>
              </Alert>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 self-start rounded-xl border border-border p-4">
          {isRecovering ? (
            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Cotação original</dt>
                <dd className="font-medium">v{attempt?.payload.quoteVersion}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Rede</dt>
                <dd className="font-medium">{attempt?.payload.network}</dd>
              </div>
            </dl>
          ) : (
            <>
              <CartTotals
                quote={quote}
                isLoading={cartQuery.isPending || quoteQuery.isPending}
                isError={quoteQuery.isError}
                error={quoteQuery.error}
                onRetry={() => void quoteQuery.refetch()}
              />
              {hasUnavailableItem ? (
                <Alert variant="destructive">
                  <AlertTitle>Compra bloqueada</AlertTitle>
                  <AlertDescription>Ajuste ou remova os itens indisponíveis no carrinho antes de continuar.</AlertDescription>
                </Alert>
              ) : null}
              {quoteReviewed ? (
                <Alert>
                  <AlertTitle>Cotação revisada</AlertTitle>
                  <AlertDescription>Você aceitou a cotação {quote?.quoteVersion}. Ela será revalidada antes do envio.</AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertTitle>Revise a cotação atual</AlertTitle>
                  <AlertDescription>
                    {relevantUpdate
                      ? 'O preço ou a disponibilidade do carrinho mudou. Aceite a nova cotação para continuar.'
                      : 'A compra só pode ser enviada depois que você aceitar a cotação atual.'}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="button" variant="outline" onClick={handleReviewQuote} disabled={!canReviewQuote || quoteReviewed || Boolean(attempt)}>
                {quoteReviewed ? 'Cotação revisada' : 'Revisar e aceitar cotação atual'}
              </Button>
            </>
          )}

          <Button
            type="button"
            onClick={() => void handlePurchase()}
            disabled={!readyToPurchase || (!isRecovering && !selectedWallet)}
          >
            {isProcessing ? 'Enviando pedido…' : isRecovering ? 'Retomar tentativa anterior' : 'Confirmar compra'}
          </Button>
          {!isRecovering && connection !== 'connected' ? (
            <p className="text-xs text-muted-foreground">Conecte a carteira para habilitar o envio do pedido.</p>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </aside>
      </section>
    </div>
  )
}
