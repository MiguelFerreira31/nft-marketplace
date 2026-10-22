import { http } from '@/shared/api/http'
import type {
  AddFavoriteRequest,
  AddFavoriteResponse,
  FavoritesListResponse,
  NftId,
  RemoveFavoriteResponse,
} from '@/shared/types'

export const favoritesApi = {
  list(signal?: AbortSignal) {
    return http.get<FavoritesListResponse>('/favorites', { signal }).then((response) => response.data)
  },

  add(nftId: NftId) {
    const body: AddFavoriteRequest = { nftId }
    return http.post<AddFavoriteResponse>('/favorites', body).then((response) => response.data)
  },

  remove(nftId: NftId) {
    return http.delete<RemoveFavoriteResponse>(`/favorites/${nftId}`).then((response) => response.data)
  },
}
