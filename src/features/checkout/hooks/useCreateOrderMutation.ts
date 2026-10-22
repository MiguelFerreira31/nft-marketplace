import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/http'
import { queryKeys } from '@/shared/query/keys'
import type { CreateOrderRequest, IdempotencyKey } from '@/shared/types'
import { ordersApi } from '../api/orders.api'

/**
 * `retry: false` é deliberado — reenviar automaticamente via TanStack Query
 * duplicaria a semântica de idempotência controlada pelo chamador (seção 5:
 * "a mesma tentativa deve recuperar o mesmo pedido"). O botão de "tentar de
 * novo" após timeout deve chamar `mutate` de novo passando a MESMA
 * `idempotencyKey` (guardada em estado local pelo `agent-checkout`,
 * Fase 7) — não gerar uma nova a cada clique (ver
 * `src/shared/api/idempotency.ts`).
 */
export function useCreateOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation<Awaited<ReturnType<typeof ordersApi.create>>, ApiError, { payload: CreateOrderRequest; idempotencyKey: IdempotencyKey }>({
    mutationFn: ({ payload, idempotencyKey }) => ordersApi.create(payload, idempotencyKey),
    retry: false,
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(order.id), order)
    },
  })
}
