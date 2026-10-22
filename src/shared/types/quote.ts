import type { EthAmount, IsoDateTime, Quantity } from './common'
import type { EditionId } from './nft'

export interface QuoteItem {
  editionId: EditionId
  quantity: Quantity
  unitPriceEth: EthAmount
  subtotalEth: EthAmount
  /** `false` quando a edição não tem mais estoque suficiente para a quantidade pedida. */
  available: boolean
}

/**
 * Cotação do carrinho — é a referência final para concluir o pedido (seção
 * 3: "A cotação da API é a referência para finalizar o pedido."). O
 * checkout deve recusar confirmar um pedido com uma cotação cujo
 * `quoteVersion` não seja o mais recente conhecido.
 */
export interface Quote {
  cartId: string
  items: QuoteItem[]
  couponCode: string | null
  couponDiscountPercent: number | null
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  /** Incrementada a cada recálculo — usada para detectar cotação desatualizada. */
  quoteVersion: number
  expiresAt: IsoDateTime
}

export interface ApplyCouponRequest {
  cartId: string
  code: string
}

export type QuoteResponse = Quote
export type ApplyCouponResponse = Quote
export type RemoveCouponResponse = Quote
