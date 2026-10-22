import { createFileRoute } from '@tanstack/react-router'
import { CatalogGridSkeleton } from '@/features/catalog/components/catalog-grid-skeleton'
import { catalogSearchSchema } from '@/features/catalog/search'

/**
 * Início (readme §3): destaques, catálogo, busca, filtros, ordenação e
 * navegação para o NFT. Busca/filtros/ordenação/paginação já compõem o
 * estado da URL via `validateSearch` (readme §3 "Catálogo e detalhe") —
 * a Fase 4 (`agent-catalog`) consome `Route.useSearch()` para disparar
 * `useNftsQuery` e renderizar a listagem real no lugar deste skeleton.
 */
export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">NFT Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Destaques e catálogo chegam na Fase 4. Busca/filtros/ordenação/paginação já vivem na URL —{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            página {search.page}, {search.pageSize} por página
            {search.search ? `, busca "${search.search}"` : ''}
          </code>
          .
        </p>
      </div>
      <CatalogGridSkeleton />
    </div>
  )
}
