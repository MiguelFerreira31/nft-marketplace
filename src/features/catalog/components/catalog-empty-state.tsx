import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CatalogEmptyStateProps {
  hasActiveFilters: boolean
  onClearFilters: () => void
}

/**
 * Estado vazio do catálogo (readme §3: "tratamento de resultados vazios").
 * Nunca renderiza uma grade vazia sem explicação — distingue "sem resultado
 * nenhum nos mocks" de "sem resultado para os filtros atuais" (neste
 * segundo caso, oferece limpar os filtros).
 */
export function CatalogEmptyState({ hasActiveFilters, onClearFilters }: CatalogEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <SearchX aria-hidden="true" className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Nenhum NFT encontrado</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasActiveFilters
          ? 'Não encontramos itens para a busca e os filtros atuais. Tente ajustar os critérios.'
          : 'Não há NFTs disponíveis no catálogo neste momento.'}
      </p>
      {hasActiveFilters ? (
        <Button type="button" variant="outline" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}
