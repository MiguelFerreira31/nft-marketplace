import type { Brand, EthAmount, IdempotencyKey, IsoDateTime, NetworkId, Quantity } from './common'
import type { EditionId, NftId } from './nft'
import type { WalletId } from './wallets'

export type OrderId = Brand<string, 'OrderId'>

/**
 * `pending` e `confirmed`/`refused` (terminais) — seção 7: "Pedidos
 * confirmados ou recusados são terminais." O cliente deve poder recuperar
 * um pedido `pending` após refresh/reconexão sem criar outro.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'refused'

export interface OrderItem {
  editionId: EditionId
  nftId: NftId
  title: string
  quantity: Quantity
  unitPriceEth: EthAmount
  subtotalEth: EthAmount
}

/**
 * Snapshot imutável do pedido no momento da criação. O recibo é renderizado
 * exclusivamente a partir deste objeto — mudanças posteriores no catálogo
 * (preço, disponibilidade) nunca alteram um `Order` já criado.
 */
export interface Order {
  id: OrderId
  status: OrderStatus
  items: OrderItem[]
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  couponCode: string | null
  walletId: WalletId
  network: NetworkId
  /** Referência de transação simulada — só definida quando `status !== 'pending'`. */
  transactionRef: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/**
 * CHAVE DE IDEMPOTÊNCIA (seção 5)
 * ------------------------------------------------------------------
 * Toda criação de pedido (`POST /orders`) envia o header `Idempotency-Key`
 * (ver `src/shared/api/idempotency.ts`, gerada uma única vez por tentativa de
 * checkout — por exemplo via `crypto.randomUUID()` — e reutilizada em
 * qualquer reenvio automático/clique repetido/retry pós-timeout daquela
 * MESMA tentativa).
 *
 * Contrato simulado pelo MSW (Fase 2):
 * - 1ª chamada com uma chave nova → cria o pedido e grava
 *   `(idempotencyKey → payload, order)`.
 * - Nova chamada com a MESMA chave e o MESMO payload (mesmo cartId,
 *   quoteVersion, walletId, network) → não cria outro pedido; responde 200
 *   com o pedido já existente (mesmo `OrderId`).
 * - Nova chamada com a MESMA chave mas payload DIFERENTE → 409 CONFLICT
 *   (`reason: 'IDEMPOTENCY_KEY_MISMATCH'`).
 * - Uma nova tentativa de compra (ex.: usuário editou o carrinho e tentou de
 *   novo) deve gerar uma NOVA chave.
 */
export interface CreateOrderRequest {
  cartId: string
  /** Versão da cotação (`Quote.quoteVersion`) que o usuário revisou e confirmou. */
  quoteVersion: number
  walletId: WalletId
  network: NetworkId
}

export interface CreateOrderHeaders {
  'Idempotency-Key': IdempotencyKey
}

export type CreateOrderResponse = Order
export type OrderResponse = Order
