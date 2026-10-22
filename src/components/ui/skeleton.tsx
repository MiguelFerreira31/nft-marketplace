import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Primitivo de skeleton com shimmer (Task 1.2, readme §8). O shimmer vem do
 * utilitário `.skeleton-shimmer` (`src/index.css`), que já respeita
 * `prefers-reduced-motion` — este componente não decide nada sobre
 * animação, só aplica a classe.
 *
 * Quem usa este componente é responsável por fixar a dimensão final do
 * conteúdo real (`h-*`/`w-*`/`aspect-*`) para não haver layout shift quando
 * os dados chegarem e o skeleton for substituído pelo conteúdo — ver
 * `src/components/catalog`, `src/components/cart` para os casos concretos
 * (grade do catálogo, detalhe do NFT, resumo do carrinho).
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
