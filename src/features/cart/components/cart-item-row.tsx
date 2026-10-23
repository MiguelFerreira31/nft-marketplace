import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/features/catalog/components/quantity-stepper'
import { describeQueryError } from '@/features/catalog/lib/api-error-message'
import { getApiErrorBody } from '@/shared/api/http'
import type { CartItem, UserId } from '@/shared/types'
import { useRemoveCartItemMutation, useUpdateCartItemMutation } from '../hooks/useCartMutations'

interface CartItemRowProps {
  item: CartItem
  userId: UserId | 'guest'
  /**
   * Chamado quando uma mutation deste item falha por conflito de estoque
   * (409 `STOCK_UNAVAILABLE`) ou o item já não existe mais (404
   * `cart_item`) — o pai deve rebuscar o carrinho para a UI refletir o
   * estado real (seção 7 do readme: preço/disponibilidade podem mudar
   * enquanto o carrinho está aberto).
   */
  onNeedsRefresh: () => void
}

/**
 * Linha de item do carrinho (readme §3 "Carrinho": imagem, nome, preço
 * unitário, quantidade, subtotal do item, remoção). `unitPriceEth` e
 * `subtotalEth` vêm sempre de `CartItem` (API) — nunca recalculados aqui
 * (seção 3.2 de `ARCHITECTURE.md`).
 *
 * `availableQuantity` do item já é recalculado pela API a cada leitura do
 * carrinho a partir do estado atual da edição (`refreshCartPricing`,
 * Fase 2) — se a quantidade pedida ficar acima do disponível (edição
 * perdeu estoque enquanto o carrinho estava aberto), avisamos explicitamente
 * em texto (não só por cor, readme §8) e limitamos o incremento da
 * quantidade, mas preservamos o item para o usuário decidir (ajustar ou
 * remover).
 */
export function CartItemRow({ item, userId, onNeedsRefresh }: CartItemRowProps) {
  const updateItem = useUpdateCartItemMutation(userId)
  const removeItem = useRemoveCartItemMutation(userId)

  const soldOut = item.availableQuantity <= 0
  const exceedsAvailable = item.quantity > item.availableQuantity
  const pending = updateItem.isPending || removeItem.isPending

  function handleQuantityChange(nextQuantity: number) {
    if (nextQuantity === item.quantity || pending) return
    updateItem.mutate(
      { itemId: item.id, payload: { quantity: nextQuantity } },
      {
        onError: (mutationError) => {
          const body = getApiErrorBody(mutationError)
          if (body?.code === 'CONFLICT' && body.reason === 'STOCK_UNAVAILABLE') {
            onNeedsRefresh()
          }
        },
      },
    )
  }

  function handleRemove() {
    removeItem.mutate(item.id, {
      onError: (mutationError) => {
        const body = getApiErrorBody(mutationError)
        if (body?.code === 'NOT_FOUND') onNeedsRefresh()
      },
    })
  }

  const mutationError = updateItem.error ?? removeItem.error

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
      <img src={item.coverImageUrl} alt="" className="size-20 shrink-0 rounded-lg object-cover" />

      <div className="flex flex-1 flex-col gap-1">
        <p className="font-medium text-foreground">{item.title}</p>
        <p className="text-sm text-muted-foreground">{item.unitPriceEth} ETH cada</p>
        {exceedsAvailable ? (
          <p role="status" className="text-sm font-medium text-destructive">
            {soldOut
              ? 'Esta edição está esgotada agora.'
              : `Só ${item.availableQuantity} disponível(is) agora — ajuste a quantidade.`}
          </p>
        ) : null}
        {mutationError ? (
          <p role="alert" className="text-sm text-destructive">
            {describeQueryError(mutationError)}
          </p>
        ) : null}
      </div>

      <QuantityStepper
        value={item.quantity}
        max={Math.max(item.availableQuantity, 0)}
        onChange={handleQuantityChange}
        disabled={pending || soldOut}
      />

      <div className="flex flex-row items-center justify-between gap-3 sm:w-32 sm:flex-col sm:items-end">
        <p className="font-semibold text-foreground">{item.subtotalEth} ETH</p>
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={pending}>
          <Trash2 aria-hidden="true" />
          {removeItem.isPending ? 'Removendo…' : 'Remover'}
        </Button>
      </div>

    </li>
  )
}
