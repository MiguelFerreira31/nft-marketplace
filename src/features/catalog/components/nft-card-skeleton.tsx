import { Skeleton } from '@/components/ui/skeleton'

/**
 * Dimensões do card real do catálogo (Task 1.2). O card real (Fase 4,
 * `agent-catalog`) deve seguir a mesma proporção de imagem (`aspect-square`)
 * e o mesmo número/altura de linhas de texto para que trocar este skeleton
 * pelo conteúdo definitivo não produza layout shift.
 */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="presentation">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
