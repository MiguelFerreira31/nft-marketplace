import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { NftId } from '@/shared/types'
import { nftsApi } from '../api/nfts.api'

export function useNftDetailQuery(nftId: NftId | undefined) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(nftId as NftId),
    queryFn: ({ signal }) => nftsApi.detail(nftId as NftId, signal),
    // Acesso direto (seção 3: "deve suportar acesso direto") — só dispara
    // quando o id de rota já está resolvido.
    enabled: Boolean(nftId),
  })
}
