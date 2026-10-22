import { http } from '@/shared/api/http'
import type { NftDetailResponse, NftId, NftListQuery, NftListResponse } from '@/shared/types'

/**
 * Camada de TRANSPORTE do domínio catálogo: só sabe fazer requisições HTTP
 * tipadas via Axios. Não contém estado, cache, nem lógica de UI — isso é
 * responsabilidade de `../hooks` (TanStack Query) e dos componentes,
 * respectivamente.
 */
export const nftsApi = {
  list(params: NftListQuery, signal?: AbortSignal) {
    return http
      .get<NftListResponse>('/nfts', { params, signal })
      .then((response) => response.data)
  },

  detail(nftId: NftId, signal?: AbortSignal) {
    return http
      .get<NftDetailResponse>(`/nfts/${nftId}`, { signal })
      .then((response) => response.data)
  },
}
