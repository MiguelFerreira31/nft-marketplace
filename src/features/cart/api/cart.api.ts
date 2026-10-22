import { http } from '@/shared/api/http'
import type { AddCartItemRequest, CartItemId, CartResponse, UpdateCartItemRequest } from '@/shared/types'

export const cartApi = {
  get(signal?: AbortSignal) {
    return http.get<CartResponse>('/cart', { signal }).then((response) => response.data)
  },

  addItem(payload: AddCartItemRequest) {
    return http.post<CartResponse>('/cart/items', payload).then((response) => response.data)
  },

  updateItem(itemId: CartItemId, payload: UpdateCartItemRequest) {
    return http.patch<CartResponse>(`/cart/items/${itemId}`, payload).then((response) => response.data)
  },

  removeItem(itemId: CartItemId) {
    return http.delete<CartResponse>(`/cart/items/${itemId}`).then((response) => response.data)
  },
}
