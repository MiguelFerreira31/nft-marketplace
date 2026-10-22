import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder de carregamento do detalhe do NFT (readme §8). Reserva o
 * espaço das duas colunas do layout final (galeria + informações/compra)
 * para que a tela real (Fase 4) não desloque o conteúdo abaixo ao substituir
 * o skeleton pelos dados.
 */
export function NftDetailSkeleton() {
  return (
    <div
      className="grid gap-8 md:grid-cols-2"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando detalhe do NFT"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-16 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-8 w-1/4" />
        <div className="mt-2 flex items-center gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
