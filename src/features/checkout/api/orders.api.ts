import { http } from '@/shared/api/http'
import type { CreateOrderRequest, CreateOrderResponse, IdempotencyKey, OrderId, OrderResponse } from '@/shared/types'

export const ordersApi = {
  /**
   * Envia a chave de idempotência no header `Idempotency-Key` (contrato
   * completo em `src/shared/types/orders.ts`). O chamador é responsável por
   * reutilizar a MESMA `idempotencyKey` em reenvios da MESMA tentativa.
   */
  create(payload: CreateOrderRequest, idempotencyKey: IdempotencyKey) {
    return http
      .post<CreateOrderResponse>('/orders', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((response) => response.data)
  },

  get(orderId: OrderId, signal?: AbortSignal) {
    return http.get<OrderResponse>(`/orders/${orderId}`, { signal }).then((response) => response.data)
  },
}
