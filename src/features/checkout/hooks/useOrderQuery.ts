import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type { OrderId } from '@/shared/types'
import { ordersApi } from '../api/orders.api'

/**
 * Enquanto o pedido está `pending`, o polling via `refetchInterval` cobre a
 * recuperação por REST após uma desconexão do Socket.IO (seção 7:
 * "interrupção de conexão enquanto o pedido está pendente... recuperar seu
 * estado sem criar outra compra"). `order.updated` (Fase 6) complementa
 * isto com atualização instantânea quando o socket está conectado; os dois
 * convergem para o mesmo estado terminal (`confirmed`/`refused`).
 */
export function useOrderQuery(orderId: OrderId | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId as OrderId),
    queryFn: ({ signal }) => ordersApi.get(orderId as OrderId, signal),
    enabled: Boolean(orderId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3_000 : false),
  })
}
