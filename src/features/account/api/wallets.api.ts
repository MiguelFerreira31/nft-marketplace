import { http } from '@/shared/api/http'
import type { UpsertWalletRequest, UpsertWalletResponse, WalletsListResponse } from '@/shared/types'

export const walletsApi = {
  list(signal?: AbortSignal) {
    return http.get<WalletsListResponse>('/wallets', { signal }).then((response) => response.data)
  },

  upsert(payload: UpsertWalletRequest) {
    return http.put<UpsertWalletResponse>(`/wallets/${payload.kind}`, payload).then((response) => response.data)
  },
}
