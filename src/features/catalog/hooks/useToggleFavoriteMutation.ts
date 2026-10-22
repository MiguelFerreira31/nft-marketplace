import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { FavoritesListResponse, NftDetailResponse, NftSummary, UserId } from '@/shared/types'
import { favoritesApi } from '../api/favorites.api'

interface ToggleFavoriteVariables {
  userId: UserId
  /** O chamador já tem o objeto carregado (card/detalhe) — evita um GET extra só para montar o item otimista da lista de favoritos. */
  nft: NftSummary
  nextFavorited: boolean
}

function patchFavoriteFlag<T extends { id: string; isFavorited?: boolean; favoriteCount: number }>(
  item: T,
  nftId: string,
  nextFavorited: boolean,
): T {
  if (item.id !== nftId) return item
  const delta = nextFavorited === item.isFavorited ? 0 : nextFavorited ? 1 : -1
  return { ...item, isFavorited: nextFavorited, favoriteCount: item.favoriteCount + delta }
}

/**
 * ATUALIZAÇÃO OTIMISTA COM ROLLBACK (seção 4 do readme — exemplo
 * obrigatório, documentado em `ARCHITECTURE.md`).
 *
 * Favorito é a interação escolhida porque é de baixo risco (não afeta
 * dinheiro/estoque) e aparece em pelo menos três lugares ao mesmo tempo
 * (card de listagem, detalhe do NFT, lista de favoritos) — bom exemplo de
 * por que o rollback precisa restaurar TODOS os caches tocados, não só um.
 */
export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nft, nextFavorited }: ToggleFavoriteVariables) =>
      nextFavorited ? favoritesApi.add(nft.id) : favoritesApi.remove(nft.id),

    onMutate: async ({ userId, nft, nextFavorited }) => {
      const favoritesKey = queryKeys.favorites.all(userId)
      const detailKey = queryKeys.nfts.detail(nft.id)

      // Cancela fetches em voo dessas chaves para que uma resposta tardia
      // não sobrescreva o patch otimista que estamos prestes a aplicar.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: favoritesKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] === 'nfts' && query.queryKey[1] === 'list' }),
      ])

      const previousFavorites = queryClient.getQueryData<FavoritesListResponse>(favoritesKey)
      const previousDetail = queryClient.getQueryData<NftDetailResponse>(detailKey)
      const previousLists = queryClient.getQueriesData<{ items: NftSummary[] }>({
        predicate: (query) => query.queryKey[0] === 'nfts' && query.queryKey[1] === 'list',
      })

      queryClient.setQueryData<FavoritesListResponse>(favoritesKey, (current) => {
        const items = current?.items ?? []
        if (nextFavorited) {
          return items.some((item) => item.id === nft.id) ? current : { items: [...items, nft] }
        }
        return { items: items.filter((item) => item.id !== nft.id) }
      })

      queryClient.setQueryData<NftDetailResponse>(detailKey, (current) =>
        current ? patchFavoriteFlag(current, nft.id, nextFavorited) : current,
      )

      queryClient.setQueriesData<{ items: NftSummary[] }>(
        { predicate: (query) => query.queryKey[0] === 'nfts' && query.queryKey[1] === 'list' },
        (current) =>
          current ? { ...current, items: current.items.map((item) => patchFavoriteFlag(item, nft.id, nextFavorited)) } : current,
      )

      return { previousFavorites, previousDetail, previousLists, favoritesKey, detailKey }
    },

    onError: (_error, _variables, context) => {
      if (!context) return
      // Rollback: restaura exatamente os caches que foram tocados em onMutate.
      queryClient.setQueryData(context.favoritesKey, context.previousFavorites)
      queryClient.setQueryData(context.detailKey, context.previousDetail)
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key as QueryKey, data)
      }
    },

    onSettled: (_data, _error, { userId, nft }) => {
      // Reconcilia com a verdade do servidor (ex.: favoriteCount exato).
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(userId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.nfts.detail(nft.id) })
    },
  })
}
