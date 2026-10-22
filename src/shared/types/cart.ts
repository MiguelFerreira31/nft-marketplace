import type { Brand, EthAmount, IsoDateTime, Quantity } from './common'
import type { EditionId, NftId } from './nft'

export type CartItemId = Brand<string, 'CartItemId'>

export interface CartItem {
  id: CartItemId
  nftId: NftId
  editionId: EditionId
  title: string
  coverImageUrl: string
  unitPriceEth: EthAmount
  quantity: Quantity
  /** Disponibilidade atual da edição — pode divergir da quantidade pedida se mudar enquanto o carrinho está aberto (seção 7). */
  availableQuantity: Quantity
  /** `unitPriceEth * quantity`, calculado pela API — nunca recalculado localmente de forma divergente. */
  subtotalEth: EthAmount
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode: string | null
  updatedAt: IsoDateTime
}

export interface AddCartItemRequest {
  editionId: EditionId
  quantity: Quantity
}

export interface UpdateCartItemRequest {
  quantity: Quantity
}

export type CartResponse = Cart
export type AddCartItemResponse = Cart
export type UpdateCartItemResponse = Cart
export type RemoveCartItemResponse = Cart
