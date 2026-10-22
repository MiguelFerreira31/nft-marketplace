import { http } from '@/shared/api/http'
import type { ApplyCouponRequest, QuoteResponse } from '@/shared/types'

export const quoteApi = {
  get(cartId: string, signal?: AbortSignal) {
    return http.get<QuoteResponse>(`/carts/${cartId}/quote`, { signal }).then((response) => response.data)
  },

  applyCoupon(payload: ApplyCouponRequest) {
    return http.post<QuoteResponse>(`/carts/${payload.cartId}/coupon`, { code: payload.code }).then((response) => response.data)
  },

  removeCoupon(cartId: string) {
    return http.delete<QuoteResponse>(`/carts/${cartId}/coupon`).then((response) => response.data)
  },
}
