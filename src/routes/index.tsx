import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CatalogEmptyState } from '@/features/catalog/components/catalog-empty-state'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
import { CatalogGridSkeleton } from '@/features/catalog/components/catalog-grid-skeleton'
import { CatalogPagination } from '@/features/catalog/components/catalog-pagination'
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar'
import { FeaturedNfts } from '@/features/catalog/components/featured-nfts'
import { NftCard } from '@/features/catalog/components/nft-card'
import { useNftsQuery } from '@/features/catalog/hooks/useNftsQuery'
import { CATALOG_SEARCH_DEFAULTS, catalogSearchSchema } from '@/features/catalog/search'
import type { NftListQuery } from '@/shared/types'

/**
 * Início (readme §3): destaques, catálogo, busca, filtros, ordenação e
 * navegação para o NFT. Busca/filtros/ordenação/paginação compõem o estado
 * da URL via `catalogSearchSchema` (Task 1.1) — sobrevive a refresh/histórico
 * porque `Route.useSearch()` é a ÚNICA fonte de verdade consumida por
 * `useNftsQuery`; nenhum estado de filtro vive fora da URL.
 */
export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const nftsQuery = useNftsQuery(search)

  /**
   * Qualquer mudança de filtro reinicia a paginação (readme §3: "mudança de
   * filtro deve reiniciar a paginação"). Usa a forma funcional de `search`
   * para nunca pisar em um patch concorrente (ex.: dois campos debounced
   * resolvendo quase ao mesmo tempo).
   */
  function applyFilters(patch: Partial<NftListQuery>) {
    navigate({
      search: (prev) => ({ ...prev, ...patch, page: CATALOG_SEARCH_DEFAULTS.page }),
    })
  }

  function clearFilters() {
    navigate({
      search: { page: CATALOG_SEARCH_DEFAULTS.page, pageSize: search.pageSize },
    })
  }

  function goToPage(page: number) {
    navigate({ search: (prev) => ({ ...prev, page }) })
  }

  const hasActiveFilters = Boolean(
    search.search || (search.category && search.category.length > 0) || search.priceMinEth || search.priceMaxEth || search.sortKey,
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">NFT Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Descubra, favorite e colecione NFTs simulados.</p>
      </div>

      <FeaturedNfts />

      <section aria-label="Catálogo" className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Catálogo</h2>

        <CatalogToolbar search={search} onApplyFilters={applyFilters} onClearFilters={clearFilters} />

        {/* Região viva separada do grid: anuncia contagem/atualização sem repetir o grid inteiro para leitores de tela. */}
        <p aria-live="polite" className="sr-only">
          {nftsQuery.isPending
            ? 'Carregando catálogo.'
            : nftsQuery.isError
              ? 'Falha ao carregar o catálogo.'
              : nftsQuery.isFetching
                ? 'Atualizando resultados.'
                : `${nftsQuery.data?.total ?? 0} resultado(s) encontrado(s).`}
        </p>

        {nftsQuery.isPending ? (
          <CatalogGridSkeleton />
        ) : nftsQuery.isError ? (
          <CatalogErrorState error={nftsQuery.error} onRetry={() => nftsQuery.refetch()} />
        ) : nftsQuery.data.items.length === 0 ? (
          <CatalogEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <>
            <div
              className="grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 lg:grid-cols-4"
              style={{ opacity: nftsQuery.isFetching ? 0.6 : 1 }}
              aria-busy={nftsQuery.isFetching}
            >
              {nftsQuery.data.items.map((nft) => (
                <NftCard key={nft.id} nft={nft} />
              ))}
            </div>
            <CatalogPagination page={nftsQuery.data.page} totalPages={nftsQuery.data.totalPages} onPageChange={goToPage} />
          </>
        )}
      </section>
    </div>
  )
}
