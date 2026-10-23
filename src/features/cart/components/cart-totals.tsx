import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { describeQueryError } from '@/features/catalog/lib/api-error-message'
import type { Quote } from '@/shared/types'

interface CartTotalsProps {
  quote: Quote | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
}

/**
 * Subtotal/desconto/taxa de rede/total (readme §3 "Carrinho": "Exibir
 * subtotal, desconto, taxa de rede e total coerentes com a resposta da
 * API"). TODOS os valores vêm diretamente de `Quote` — nenhuma soma é
 * refeita aqui (seção 3.2 de `ARCHITECTURE.md`: a API é a única fonte de
 * verdade para estes números, o cliente só formata).
 */
export function CartTotals({ quote, isLoading, isError, error, onRetry }: CartTotalsProps) {
  if (isError) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <p className="text-destructive">{describeQueryError(error)}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isLoading || !quote) {
    return (
      <div className="flex flex-col gap-2 border-t border-border pt-4" aria-busy="true" aria-live="polite" aria-label="Calculando totais">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    )
  }

  // `fromUnits` (mock) nunca emite zero com casas decimais (sempre exatamente
  // `'0'`) — comparar a string com o literal canônico é seguro aqui e NÃO é
  // uma reimplementação de aritmética decimal (seção 3.2 de
  // `ARCHITECTURE.md`): é só uma decisão de exibição (mostrar ou não a linha
  // de desconto), nunca usado para derivar subtotal/total.
  const hasDiscount = quote.discountEth !== '0'

  return (
    <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="font-medium text-foreground">{quote.subtotalEth} ETH</dd>
      </div>
      {hasDiscount ? (
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Desconto{quote.couponDiscountPercent != null ? ` (${quote.couponDiscountPercent}%)` : ''}</dt>
          <dd className="font-medium text-foreground">-{quote.discountEth} ETH</dd>
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">Taxa de rede</dt>
        <dd className="font-medium text-foreground">{quote.networkFeeEth} ETH</dd>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
        <dt className="text-base font-semibold text-foreground">Total</dt>
        <dd className="text-base font-semibold text-foreground">{quote.totalEth} ETH</dd>
      </div>
    </dl>
  )
}
