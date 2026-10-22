import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder de carregamento do resumo do carrinho (readme §8). Reserva o
 * espaço das linhas de itens e do bloco de totais (subtotal/desconto/taxa de
 * rede/total — readme §3 "Carrinho") para que a Fase 5 (`agent-cart`) troque
 * cada linha pelo valor real sem recalcular a altura do bloco.
 */
export function CartSummarySkeleton({ itemCount = 2 }: { itemCount?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite" aria-label="Carregando carrinho">
      <ul className="flex flex-col gap-4">
        {Array.from({ length: itemCount }, (_, index) => (
          <li key={index} className="flex items-center gap-3">
            <Skeleton className="size-16 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-14" />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 border-t pt-4">
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
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}
