import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { UpsertWalletRequest, UserId } from '@/shared/types'
import { walletsApi } from '../api/wallets.api'

export function useWalletsQuery(userId: UserId | undefined) {
  return useQuery({
    queryKey: queryKeys.wallets.all(userId as UserId),
    queryFn: ({ signal }) => walletsApi.list(signal),
    enabled: Boolean(userId),
  })
}

export function useUpsertWalletMutation(userId: UserId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertWalletRequest) => walletsApi.upsert(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all(userId) }),
  })
}
