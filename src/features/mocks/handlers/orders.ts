import { delay, HttpResponse, http } from 'msw'
import type { CreateOrderRequest, CreateOrderResponse, Order, OrderId, OrderResponse } from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import { scheduleOrderResolution } from '../realtime/mutations'
import { getScenario } from '../scenario'
import { requireUser } from '../utils/auth'
import { conflictError, forbiddenError, notFoundError, validationError } from '../utils/http-error'
import { createMockId } from '../utils/ids'
import { computeQuote, findCartById } from '../utils/quote'
import { TIMEOUT_SCENARIO_DELAY_MS, withScenario } from '../utils/with-scenario'

/**
 * Chave de idempotência (contrato completo em `shared/types/orders.ts`):
 * - chave nova                      → cria o pedido.
 * - MESMA chave + MESMO payload      → devolve o pedido já criado (sem atraso).
 * - MESMA chave + payload DIFERENTE  → 409 `IDEMPOTENCY_KEY_MISMATCH`.
 *
 * Cenário dedicado "timeout após criação do pedido, com recuperação por
 * idempotência" (seção 6): quando `scenario.ordersCreateTimeoutOnce` está
 * ativo, a criação acontece normalmente (pedido já existe no backend
 * simulado, já agendado para resolver), mas a resposta HTTP desta 1ª
 * chamada é deliberadamente atrasada além do timeout do client — o client
 * vê um erro de timeout e, ao reenviar com a MESMA chave, cai no caminho
 * "mesma chave + mesmo payload" acima, que responde imediatamente.
 */
export const orderHandlers = [
  http.post(
    '/api/orders',
    withScenario('orders.create', async ({ request }) => {
      const idempotencyKey = request.headers.get('Idempotency-Key')
      if (!idempotencyKey) {
        throw validationError({ 'Idempotency-Key': ['O header Idempotency-Key é obrigatório.'] })
      }

      const body = (await request.json()) as CreateOrderRequest
      const db = await getDb()
      const user = requireUser(db)

      const existing = db.idempotency[idempotencyKey]
      if (existing) {
        const existingRecord = db.orders[existing.orderId]
        if (!existingRecord || existingRecord.ownerUserId !== user.id) {
          throw forbiddenError('Este pedido pertence a outro usuário.')
        }
        const samePayload = JSON.stringify(existing.payload) === JSON.stringify(body)
        if (!samePayload) {
          throw conflictError('IDEMPOTENCY_KEY_MISMATCH', 'Esta chave de idempotência já foi usada com um pedido diferente.')
        }
        const response: CreateOrderResponse = existingRecord.order
        return HttpResponse.json(response)
      }

      const cart = findCartById(db, body.cartId)
      if (!cart) throw notFoundError('cart_item', 'Carrinho não encontrado.')
      if (cart.id !== user.cart.id) throw forbiddenError('Este carrinho pertence a outro usuário.')
      if (cart.items.length === 0) {
        throw validationError({ cartId: ['O carrinho está vazio.'] })
      }

      const wallet = user.wallets.find((candidate) => candidate.id === body.walletId)
      if (!wallet) throw notFoundError('wallet', 'Carteira não encontrada.')
      if (body.network !== wallet.network) {
        throw validationError({ network: ['A rede não corresponde à carteira selecionada.'] })
      }

      const pendingRecord = Object.values(db.orders).find(
        (record) => record.cartId === cart.id && record.ownerUserId === user.id && record.order.status === 'pending',
      )
      if (pendingRecord) {
        db.idempotency[idempotencyKey] = { payload: body, orderId: pendingRecord.order.id, pendingTimeout: false }
        persistDb(db)
        const response: CreateOrderResponse = pendingRecord.order
        return HttpResponse.json(response)
      }

      const couponPercent = cart.couponCode ? (db.coupons.find((coupon) => coupon.code === cart.couponCode)?.discountPercent ?? null) : null
      const quote = computeQuote(db, cart, couponPercent)

      if (quote.quoteVersion !== body.quoteVersion || quote.items.some((item) => !item.available)) {
        throw conflictError('STOCK_UNAVAILABLE', 'A cotação está desatualizada — revise o carrinho e confirme novamente.')
      }

      const now = new Date().toISOString()
      const order: Order = {
        id: createMockId('order') as OrderId,
        status: 'pending',
        version: 0,
        items: cart.items.map((item) => ({
          editionId: item.editionId,
          nftId: item.nftId,
          title: item.title,
          quantity: item.quantity,
          unitPriceEth: item.unitPriceEth,
          subtotalEth: item.subtotalEth,
        })),
        subtotalEth: quote.subtotalEth,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        couponCode: quote.couponCode,
        walletId: wallet.id,
        network: body.network,
        transactionRef: null,
        createdAt: now,
        updatedAt: now,
      }
      db.orders[order.id] = { order, cartId: cart.id, ownerUserId: user.id }

      const scenario = getScenario()
      const delayThisResponse = scenario.ordersCreateTimeoutOnce
      db.idempotency[idempotencyKey] = { payload: body, orderId: order.id, pendingTimeout: delayThisResponse }
      persistDb(db)

      scheduleOrderResolution(db, order.id)

      if (delayThisResponse) {
        // O pedido já existe e já foi agendado para resolver — só a
        // ENTREGA desta resposta é atrasada. O client desiste (timeout) antes
        // dela chegar; o reenvio com a mesma chave cai no caminho rápido acima.
        await delay(TIMEOUT_SCENARIO_DELAY_MS)
      }

      const response: CreateOrderResponse = order
      return HttpResponse.json(response, { status: 201 })
    }),
  ),

  http.get(
    '/api/orders/:orderId',
    withScenario('orders.get', async ({ params }) => {
      const db = await getDb()
      const user = requireUser(db)
      const orderId = params.orderId as OrderId
      const record = db.orders[orderId]
      if (!record) throw notFoundError('order', 'Pedido não encontrado.')
      if (record.ownerUserId !== user.id) throw forbiddenError('Este pedido pertence a outro usuário.')

      const response: OrderResponse = record.order
      return HttpResponse.json(response)
    }),
  ),
]
