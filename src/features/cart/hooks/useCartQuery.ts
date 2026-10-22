import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { UserId } from '@/shared/types'
import { cartApi } from '../api/cart.api'

/**
 * `userId` é `'guest'` para visitante. O carrinho de visitante persiste
 * localmente (ver ARCHITECTURE.md) e é mesclado ao carrinho do usuário no
 * login (seção 3: "preservar os itens do visitante ao autenticar") — a
 * mesclagem em si é responsabilidade do `agent-cart`/`agent-auth` (Fases 3 e
 * 5); aqui só garantimos que a chave de cache nunca mistura os dois.
 */
export function useCartQuery(userId: UserId | 'guest') {
  return useQuery({
    queryKey: queryKeys.cart.detail(userId),
    queryFn: ({ signal }) => cartApi.get(signal),
    staleTime: 10_000,
  })
}
