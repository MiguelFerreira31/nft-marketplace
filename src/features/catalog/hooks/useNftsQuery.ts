import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { NftListQuery } from '@/shared/types'
import { nftsApi } from '../api/nfts.api'

/**
 * Camada de ESTADO do domínio catálogo (TanStack Query). Isola cache por
 * parâmetros de busca (`queryKeys.nfts.list(params)`) — filtros/página
 * diferentes nunca compartilham cache nem disparam corrida de respostas fora
 * de ordem: o `queryKey` muda, a query anterior é automaticamente
 * cancelada/ignorada pelo Query (seção 4: "cancelamento ou descarte de
 * respostas obsoletas").
 *
 * `keepPreviousData` evita que a lista pisque para o skeleton ao trocar de
 * página/filtro — mantém os itens antigos visíveis (com `isFetching: true`)
 * até a nova página chegar.
 */
export function useNftsQuery(params: NftListQuery) {
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => nftsApi.list(params, signal),
    placeholderData: keepPreviousData,
  })
}
