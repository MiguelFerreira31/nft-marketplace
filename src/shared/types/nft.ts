import type { Brand, EthAmount, IsoDateTime, PaginatedResponse, PaginationParams, Quantity, SortOrder } from './common'

export type NftId = Brand<string, 'NftId'>
export type EditionId = Brand<string, 'EditionId'>

export interface NftCreator {
  id: string
  name: string
  avatarUrl: string | null
}

export interface NftCollection {
  id: string
  name: string
}

/**
 * Edição comprável de um NFT. Um NFT pode ter uma ou mais edições, cada uma
 * com preço e disponibilidade próprios — é a edição (não o NFT) que entra no
 * carrinho.
 */
export interface Edition {
  id: EditionId
  nftId: NftId
  name: string
  priceEth: EthAmount
  availableQuantity: Quantity
  totalQuantity: Quantity
}

interface NftBase {
  id: NftId
  slug: string
  title: string
  coverImageUrl: string
  category: string
  creator: NftCreator
  collection: NftCollection
  /** Menor preço entre as edições ativas — usado em cards de listagem. */
  priceFromEth: EthAmount
  favoriteCount: number
  /** Presente apenas quando a requisição é autenticada. */
  isFavorited?: boolean
  /** Incrementada a cada mudança relevante (preço/disponibilidade) — usada para descartar eventos `nft.updated` desatualizados (seção 7). */
  version: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** Shape usado em listagens (catálogo, destaques, carrinho). */
export type NftSummary = NftBase

/** Shape usado na tela de detalhe. */
export interface NftDetail extends NftBase {
  description: string
  galleryImageUrls: string[]
  editions: Edition[]
}

export type NftSortKey = 'relevance' | 'price' | 'newest'

export interface NftListQuery extends PaginationParams {
  search?: string
  category?: string[]
  priceMinEth?: EthAmount
  priceMaxEth?: EthAmount
  sortKey?: NftSortKey
  sortOrder?: SortOrder
}

export type NftListResponse = PaginatedResponse<NftSummary>

export type NftDetailResponse = NftDetail
