import type { EthAmount, IsoDateTime, Quantity } from './common'
import type { EditionId, NftId } from './nft'
import type { OrderId, OrderStatus } from './orders'

/**
 * Envelope comum a todo evento Socket.IO (seção 7): identidade estável,
 * recurso afetado e versão monotônica. O cliente usa `version` para
 * descartar duplicatas e eventos antigos sem regredir estado já mais
 * recente (ex.: recebido via REST após reconexão) nem reaplicar efeitos.
 */
export interface RealtimeEventEnvelope<TResource extends string, TPayload> {
  /** Identificador estável do evento em si (idempotência de efeito do lado do cliente). */
  id: string
  resource: TResource
  resourceId: string
  /** Versão monotônica do recurso, compartilhada com `Nft.version` ou `Order.version`. */
  version: number
  occurredAt: IsoDateTime
  payload: TPayload
}

export interface NftUpdatedPayload {
  nftId: NftId
  editionId?: EditionId
  priceEth?: EthAmount
  availableQuantity?: Quantity
  /** Preço mínimo atual informado pelo MockDb para atualizar cards sem aproximação local. */
  priceFromEth?: EthAmount
}

export interface OrderUpdatedPayload {
  orderId: OrderId
  status: OrderStatus
}

export type NftUpdatedEvent = RealtimeEventEnvelope<'nft', NftUpdatedPayload>
export type OrderUpdatedEvent = RealtimeEventEnvelope<'order', OrderUpdatedPayload>

/**
 * Mapa evento → payload usado para tipar `socket.io-client` (ver
 * `src/features/realtime/client/socket.ts`). Qualquer novo evento deve ser
 * adicionado aqui para permanecer tipado ponta a ponta.
 */
export interface RealtimeServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

/** Nenhum evento client→server previsto até a Fase 6. */
export type RealtimeClientToServerEvents = Record<string, never>
