import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { AddCartItemRequest, CartItemId, CartResponse, UpdateCartItemRequest, UserId } from '@/shared/types'
import { cartApi } from '../api/cart.api'

/**
 * Mutations de carrinho invalidam (não reescrevem otimisticamente) o
 * carrinho e a cotação após sucesso: totais/desconto/taxa de rede vêm
 * sempre recalculados pela API (seção 3: "coerentes com a resposta da
 * API"), nunca somados localmente de forma divergente. O exemplo de
 * atualização otimista com rollback do desafio é o favorito
 * (`useToggleFavoriteMutation`, domínio catálogo); ver justificativa em
 * `ARCHITECTURE.md`.
 */
function useInvalidateCart(userId: UserId | 'guest') {
  const queryClient = useQueryClient()
  return (cart: CartResponse) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.quote.detail(cart.id) }),
    ])
}

export function useAddCartItemMutation(userId: UserId | 'guest') {
  const invalidateCart = useInvalidateCart(userId)
  return useMutation({
    mutationFn: (payload: AddCartItemRequest) => cartApi.addItem(payload),
    onSuccess: invalidateCart,
  })
}

export function useUpdateCartItemMutation(userId: UserId | 'guest') {
  const invalidateCart = useInvalidateCart(userId)
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: CartItemId; payload: UpdateCartItemRequest }) =>
      cartApi.updateItem(itemId, payload),
    onSuccess: invalidateCart,
  })
}

export function useRemoveCartItemMutation(userId: UserId | 'guest') {
  const invalidateCart = useInvalidateCart(userId)
  return useMutation({
    mutationFn: (itemId: CartItemId) => cartApi.removeItem(itemId),
    onSuccess: invalidateCart,
  })
}
