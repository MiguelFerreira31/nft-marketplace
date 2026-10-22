import type { IsoDateTime } from './common'
import type { NftId, NftSummary } from './nft'

export interface FavoritesListResponse {
  items: NftSummary[]
}

export interface AddFavoriteRequest {
  nftId: NftId
}

export interface AddFavoriteResponse {
  nftId: NftId
  favoritedAt: IsoDateTime
}

/** DELETE /favorites/:nftId — sem corpo de resposta. */
export type RemoveFavoriteResponse = null
