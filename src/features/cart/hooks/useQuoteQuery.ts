import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import { quoteApi } from '../api/quote.api'

/**
 * Cotação tem `staleTime: 0` — é sempre revalidada antes de qualquer decisão
 * de checkout (seção 3: "Revalidar preço, disponibilidade, cupom e taxas
 * antes de confirmar a compra"). O componente de checkout (Fase 7) deve
 * refazer este fetch imediatamente antes de habilitar o botão de confirmar.
 */
export function useQuoteQuery(cartId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quote.detail(cartId ?? ''),
    queryFn: ({ signal }) => quoteApi.get(cartId as string, signal),
    enabled: Boolean(cartId),
    staleTime: 0,
  })
}

export function useApplyCouponMutation(cartId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => quoteApi.applyCoupon({ cartId, code }),
    onSuccess: (quote) => queryClient.setQueryData(queryKeys.quote.detail(cartId), quote),
  })
}

export function useRemoveCouponMutation(cartId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => quoteApi.removeCoupon(cartId),
    onSuccess: (quote) => queryClient.setQueryData(queryKeys.quote.detail(cartId), quote),
  })
}
