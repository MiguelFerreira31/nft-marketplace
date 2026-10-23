import { useNftsQuery } from '../hooks/useNftsQuery'
import { NftCard } from './nft-card'
import { NftCardSkeleton } from './nft-card-skeleton'

const FEATURED_QUERY = {
  page: 1,
  pageSize: 4,
  sortKey: 'relevance' as const,
  sortOrder: 'desc' as const,
}

/**
 * "Destaques" do Início (readme §3: "Início | Destaques, catálogo, busca...").
 * Sempre os 4 NFTs mais favoritados, independente da busca/filtros ativos
 * na URL — uma consulta isolada (própria `queryKey`, via `useNftsQuery`) que
 * não participa da paginação/filtros do catálogo abaixo.
 */
export function FeaturedNfts() {
  const query = useNftsQuery(FEATURED_QUERY)

  if (query.isError) return null // destaques são um bônus visual; a seção de catálogo abaixo já trata erro/retry.

  return (
    <section aria-label="Destaques" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Destaques</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-busy={query.isPending}>
        {query.isPending
          ? Array.from({ length: 4 }, (_, index) => <NftCardSkeleton key={index} />)
          : query.data?.items.map((nft) => <NftCard key={nft.id} nft={nft} />)}
      </div>
    </section>
  )
}
