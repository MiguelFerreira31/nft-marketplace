import type { NftSortKey, SortOrder } from '@/shared/types'

/**
 * Categorias fictícias do catálogo (readme §3 "Catálogo e detalhe": filtros
 * combináveis). Reaproveita exatamente os valores usados pelas fixtures do
 * mock (`src/features/mocks/fixtures/types.ts#NFT_CATEGORIES`) — a UI não
 * importa daquele módulo (que é escopo exclusivo de `agent-mocks`/`src/features/mocks`),
 * mas os valores precisam ser idênticos para o filtro `category` realmente
 * casar com algum item na API simulada. Se as fixtures um dia ganharem uma
 * categoria nova, esta lista precisa ser atualizada manualmente.
 */
export interface CatalogCategoryOption {
  value: string
  label: string
}

export const CATALOG_CATEGORY_OPTIONS: CatalogCategoryOption[] = [
  { value: 'art', label: 'Arte' },
  { value: 'music', label: 'Música' },
  { value: 'photography', label: 'Fotografia' },
  { value: 'gaming', label: 'Games' },
  { value: 'collectibles', label: 'Colecionáveis' },
  { value: 'virtual-worlds', label: 'Mundos virtuais' },
]

export interface CatalogSortOption {
  id: string
  sortKey: NftSortKey
  sortOrder: SortOrder
  label: string
}

/** Opções de ordenação exibidas no seletor único (combina `sortKey` + `sortOrder`). */
export const CATALOG_SORT_OPTIONS: CatalogSortOption[] = [
  { id: 'relevance-desc', sortKey: 'relevance', sortOrder: 'desc', label: 'Mais relevantes' },
  { id: 'newest-desc', sortKey: 'newest', sortOrder: 'desc', label: 'Mais recentes' },
  { id: 'price-asc', sortKey: 'price', sortOrder: 'asc', label: 'Menor preço' },
  { id: 'price-desc', sortKey: 'price', sortOrder: 'desc', label: 'Maior preço' },
]

export const DEFAULT_SORT_OPTION_ID = 'relevance-desc'

export function sortOptionId(sortKey: NftSortKey | undefined, sortOrder: SortOrder | undefined): string {
  const found = CATALOG_SORT_OPTIONS.find(
    (option) => option.sortKey === (sortKey ?? 'relevance') && option.sortOrder === (sortOrder ?? 'desc'),
  )
  return found?.id ?? DEFAULT_SORT_OPTION_ID
}
