import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { NftUpdatedEvent } from '@/shared/types'

export interface RealtimeCartNftUpdate {
  event: NftUpdatedEvent
  cartId: string
}

export function useRealtimeNftEvents() {
  return useQuery<RealtimeCartNftUpdate[]>({
    queryKey: queryKeys.realtime.nftEvents(),
    queryFn: async () => [],
    initialData: [],
    enabled: false,
    staleTime: Infinity,
  })
}
