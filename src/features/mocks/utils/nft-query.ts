import type { NftDetail, NftListQuery, NftSummary, PaginatedResponse } from '@/shared/types'
import { isGreaterOrEqual } from './decimal'

export function toSummary(nft: NftDetail, favoritedNftIds: Set<string> | null): NftSummary {
  const { description: _description, galleryImageUrls: _galleryImageUrls, editions: _editions, ...summary } = nft
  return favoritedNftIds ? { ...summary, isFavorited: favoritedNftIds.has(nft.id) } : summary
}

function matchesSearch(nft: NftDetail, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return (
    nft.title.toLowerCase().includes(needle) ||
    nft.description.toLowerCase().includes(needle) ||
    nft.collection.name.toLowerCase().includes(needle) ||
    nft.creator.name.toLowerCase().includes(needle)
  )
}

/**
 * Filtra, ordena e pagina a lista de NFTs — TODA a lógica de busca/filtros/
 * ordenação/paginação do catálogo vive aqui (seção 5: "Listagem com
 * busca/filtros/ordenação/paginação"), nunca no client.
 */
export function queryNfts(
  allNfts: NftDetail[],
  query: NftListQuery,
  favoritedNftIds: Set<string> | null,
): PaginatedResponse<NftSummary> {
  let items = allNfts.filter((nft) => matchesSearch(nft, query.search ?? ''))

  if (query.category && query.category.length > 0) {
    const categories = new Set(query.category)
    items = items.filter((nft) => categories.has(nft.category))
  }

  if (query.priceMinEth) {
    items = items.filter((nft) => isGreaterOrEqual(nft.priceFromEth, query.priceMinEth!))
  }
  if (query.priceMaxEth) {
    items = items.filter((nft) => isGreaterOrEqual(query.priceMaxEth!, nft.priceFromEth))
  }

  const sortKey = query.sortKey ?? 'relevance'
  const sortOrder = query.sortOrder ?? 'asc'
  const direction = sortOrder === 'desc' ? -1 : 1

  const sorted = [...items].sort((a, b) => {
    switch (sortKey) {
      case 'price':
        return (Number(a.priceFromEth) - Number(b.priceFromEth)) * direction
      case 'newest':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction
      case 'relevance':
      default:
        return (b.favoriteCount - a.favoriteCount) * direction
    }
  })

  const page = Math.max(1, query.page)
  const pageSize = Math.max(1, query.pageSize)
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const pageItems = sorted.slice(start, start + pageSize)

  return {
    items: pageItems.map((nft) => toSummary(nft, favoritedNftIds)),
    page,
    pageSize,
    total,
    totalPages,
  }
}
