import { NftCardSkeleton } from './nft-card-skeleton'

/**
 * Placeholder de carregamento da grade do catálogo (Início — readme §8).
 * Replica o grid responsivo que a Fase 4 vai usar para a listagem real
 * (2 colunas em mobile / 3 em tablet / 4 em desktop) para que o número de
 * "slots" visíveis e sua largura não mudem quando os dados chegarem —
 * apenas o conteúdo de cada card troca de skeleton para card real.
 */
export function CatalogGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando catálogo de NFTs"
    >
      {Array.from({ length: count }, (_, index) => (
        <NftCardSkeleton key={index} />
      ))}
    </div>
  )
}
