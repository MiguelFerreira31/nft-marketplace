import type { EditionId, NftId, NftUpdatedEvent, Order, OrderId, OrderUpdatedEvent } from '@/shared/types'
import { persistDb } from '../db/store'
import type { MockDb } from '../db/types'
import { getScenario } from '../scenario'
import { mulEthByQuantity } from '../utils/decimal'
import { createMockId } from '../utils/ids'
import { findCartById } from '../utils/quote'
import { emitNftUpdated, emitOrderUpdated } from './events'

/**
 * Ponte entre mutações no `MockDb` e os eventos Socket.IO (seção 7 do
 * readme). Qualquer alteração de preço/disponibilidade de NFT (seja via
 * `POST /api/__mock__/simulate/nft-update`, seja pela confirmação de um
 * pedido abaixo) e qualquer transição de status de pedido passam por aqui —
 * é isto que garante "mudanças nos dados simulados devem ser refletidas
 * tanto nas respostas REST quanto nos eventos correspondentes" (seção 6).
 */
export interface NftUpdatePatch {
  editionId?: EditionId
  priceEth?: string
  availableQuantity?: number
}

export function applyNftUpdate(db: MockDb, nftId: NftId, patch: NftUpdatePatch): NftUpdatedEvent {
  const nft = db.nfts.find((candidate) => candidate.id === nftId)
  if (!nft) {
    throw new Error(`[mocks] NFT inexistente para simulação de atualização: ${nftId}`)
  }

  if (patch.editionId) {
    const edition = nft.editions.find((candidate) => candidate.id === patch.editionId)
    if (!edition) {
      throw new Error(`[mocks] edição inexistente para simulação de atualização: ${patch.editionId}`)
    }
    if (patch.priceEth !== undefined) edition.priceEth = patch.priceEth
    if (patch.availableQuantity !== undefined) edition.availableQuantity = patch.availableQuantity
  }

  const cheapestAvailable = [...nft.editions].sort((a, b) => Number(a.priceEth) - Number(b.priceEth))[0]
  if (cheapestAvailable) nft.priceFromEth = cheapestAvailable.priceEth

  nft.version += 1
  nft.updatedAt = new Date().toISOString()
  persistDb(db)

  const envelope: NftUpdatedEvent = {
    id: createMockId('evt-nft'),
    resource: 'nft',
    resourceId: nft.id,
    version: nft.version,
    occurredAt: nft.updatedAt,
    payload: {
      nftId: nft.id,
      editionId: patch.editionId,
      priceEth: patch.priceEth,
      availableQuantity: patch.availableQuantity,
    },
  }
  emitNftUpdated(envelope)
  return envelope
}

export function applyOrderStatusChange(db: MockDb, order: Order): OrderUpdatedEvent {
  const nextVersion = (db.orderEventVersions[order.id] ?? 0) + 1
  db.orderEventVersions[order.id] = nextVersion
  persistDb(db)

  const envelope: OrderUpdatedEvent = {
    id: createMockId('evt-order'),
    resource: 'order',
    resourceId: order.id,
    version: nextVersion,
    occurredAt: order.updatedAt,
    payload: { orderId: order.id, status: order.status },
  }
  emitOrderUpdated(envelope)
  return envelope
}

/**
 * Transição efetiva de um pedido `pending` para um status terminal. Idempotente:
 * um pedido que já saiu de `pending` (terminal, seção 7: "Pedidos
 * confirmados ou recusados são terminais") não é tocado de novo, não importa
 * quantas vezes isto seja chamado (timer + controle manual podem colidir).
 *
 * Só na confirmação: debita o estoque de cada edição comprada (emitindo
 * `nft.updated` para cada uma, seção 6: "mudanças nos dados simulados devem
 * ser refletidas tanto nas respostas REST quanto nos eventos") e remove do
 * carrinho ORIGINAL exatamente os itens/quantidades comprados (seção 3:
 * "após confirmação, remover do carrinho apenas os itens e quantidades
 * comprados"). Numa recusa, carrinho e estoque permanecem intactos (seção 3:
 * "Preservar os itens em falhas").
 */
function settleOrder(db: MockDb, orderId: OrderId, outcome: 'confirmed' | 'refused'): void {
  const record = db.orders[orderId]
  if (!record || record.order.status !== 'pending') return

  record.order.status = outcome
  record.order.transactionRef = outcome === 'confirmed' ? createMockId('tx') : null
  record.order.updatedAt = new Date().toISOString()

  if (outcome === 'confirmed') {
    const cart = findCartById(db, record.cartId)
    for (const item of record.order.items) {
      const nft = db.nfts.find((candidate) => candidate.id === item.nftId)
      const edition = nft?.editions.find((candidate) => candidate.id === item.editionId)
      if (edition) {
        const nextAvailable = Math.max(0, edition.availableQuantity - item.quantity)
        applyNftUpdate(db, item.nftId, { editionId: item.editionId, availableQuantity: nextAvailable })
      }

      const cartItem = cart?.items.find((candidate) => candidate.editionId === item.editionId)
      if (cart && cartItem) {
        cartItem.quantity -= item.quantity
        if (cartItem.quantity <= 0) {
          cart.items = cart.items.filter((candidate) => candidate !== cartItem)
        } else {
          cartItem.subtotalEth = mulEthByQuantity(cartItem.unitPriceEth, cartItem.quantity)
        }
      }
    }
    if (cart) cart.updatedAt = new Date().toISOString()
  }

  persistDb(db)
  applyOrderStatusChange(db, record.order)
}

/**
 * Resolve um pedido `pending` segundo `scenario.paymentOutcome` LIDO NO
 * MOMENTO EM QUE O TIMER DISPARA (não no momento em que foi agendado) — um
 * teste pode criar o pedido e só então configurar `paymentOutcome` antes do
 * timer disparar, sem corrida. Quando `paymentOutcome === 'pending-forever'`,
 * não faz nada (o pedido simula uma conexão interrompida; só o controle
 * manual — `forceOrderStatus`, via `POST /api/__mock__/simulate/order-update`
 * — o resolve).
 */
function resolveOrderPayment(db: MockDb, orderId: OrderId): void {
  const scenario = getScenario()
  if (scenario.paymentOutcome === 'pending-forever') return
  settleOrder(db, orderId, scenario.paymentOutcome === 'refused' ? 'refused' : 'confirmed')
}

/**
 * Agenda a resolução do pedido (seção 7). Não agenda nada quando o cenário
 * já é `pending-forever` no momento da criação — esse pedido só sai de
 * `pending` por uma chamada explícita a `forceOrderStatus` (ver abaixo),
 * simulando exatamente o roteiro "interrupção de conexão enquanto o pedido
 * está pendente; após reconectar, o usuário recupera o estado".
 */
export function scheduleOrderResolution(db: MockDb, orderId: OrderId): void {
  const scenario = getScenario()
  if (scenario.paymentOutcome === 'pending-forever') return
  setTimeout(() => resolveOrderPayment(db, orderId), scenario.paymentResolutionDelayMs)
}

/**
 * Força a resolução de um pedido `pending` para um status terminal
 * específico, ignorando `scenario.paymentOutcome` — usado pelo endpoint de
 * controle `POST /api/__mock__/simulate/order-update` para destravar um
 * pedido deixado deliberadamente pendente (`paymentOutcome: 'pending-forever'`)
 * e simular a reconexão/confirmação tardia.
 */
export function forceOrderStatus(db: MockDb, orderId: OrderId, status: 'confirmed' | 'refused'): void {
  settleOrder(db, orderId, status)
}
