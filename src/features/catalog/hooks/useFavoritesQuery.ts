import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { UserId } from '@/shared/types'
import { favoritesApi } from '../api/favorites.api'

/**
 * Favoritos são um recurso privado — seção 3: "Favoritos devem persistir
 * para o usuário autenticado." A query key inclui `userId`
 * (`queryKeys.favorites.all`), então um logout/troca de usuário (Fase 3)
 * basta remover as entradas daquele `userId` do cache; nunca aparece dado
 * do usuário anterior para o próximo (isolamento por usuário, seção 4).
 */
export function useFavoritesQuery(userId: UserId | undefined) {
  return useQuery({
    queryKey: queryKeys.favorites.all(userId as UserId),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: Boolean(userId),
  })
}
