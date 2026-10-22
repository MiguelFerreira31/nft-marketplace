import { HttpResponse, http } from 'msw'
import type { AddCartItemRequest, CartItemId, CartResponse, UpdateCartItemRequest } from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import { refreshCartPricing, resolveActiveCart } from '../utils/cart'
import { mulEthByQuantity } from '../utils/decimal'
import { conflictError, notFoundError, validationError } from '../utils/http-error'
import { createMockId } from '../utils/ids'
import { withScenario } from '../utils/with-scenario'

export const cartHandlers = [
  http.get(
    '/api/cart',
    withScenario('cart.get', async () => {
      const db = await getDb()
      const cart = refreshCartPricing(db, resolveActiveCart(db))
      persistDb(db)
      const response: CartResponse = cart
      return HttpResponse.json(response)
    }),
  ),

  http.post(
    '/api/cart/items',
    withScenario('cart.addItem', async ({ request }) => {
      const db = await getDb()
      const body = (await request.json()) as AddCartItemRequest

      if (!Number.isInteger(body.quantity) || body.quantity < 1) {
        throw validationError({ quantity: ['A quantidade deve ser um inteiro maior que zero.'] })
      }

      const nft = db.nfts.find((candidate) => candidate.editions.some((edition) => edition.id === body.editionId))
      const edition = nft?.editions.find((candidate) => candidate.id === body.editionId)
      if (!nft || !edition) throw notFoundError('edition', 'Edição não encontrada.')

      const cart = resolveActiveCart(db)
      const existing = cart.items.find((item) => item.editionId === body.editionId)
      const nextQuantity = (existing?.quantity ?? 0) + body.quantity
      if (nextQuantity > edition.availableQuantity) {
        throw conflictError('STOCK_UNAVAILABLE', 'Quantidade solicitada acima do estoque disponível desta edição.')
      }

      if (existing) {
        existing.quantity = nextQuantity
        existing.unitPriceEth = edition.priceEth
        existing.availableQuantity = edition.availableQuantity
        existing.subtotalEth = mulEthByQuantity(edition.priceEth, nextQuantity)
      } else {
        cart.items.push({
          id: createMockId('cart-item') as CartItemId,
          nftId: nft.id,
          editionId: edition.id,
          title: nft.title,
          coverImageUrl: nft.coverImageUrl,
          unitPriceEth: edition.priceEth,
          quantity: body.quantity,
          availableQuantity: edition.availableQuantity,
          subtotalEth: mulEthByQuantity(edition.priceEth, body.quantity),
        })
      }
      cart.updatedAt = new Date().toISOString()
      persistDb(db)

      const response: CartResponse = cart
      return HttpResponse.json(response, { status: 201 })
    }),
  ),

  http.patch(
    '/api/cart/items/:itemId',
    withScenario('cart.updateItem', async ({ request, params }) => {
      const db = await getDb()
      const body = (await request.json()) as UpdateCartItemRequest
      if (!Number.isInteger(body.quantity) || body.quantity < 1) {
        throw validationError({ quantity: ['A quantidade deve ser um inteiro maior que zero.'] })
      }

      const cart = resolveActiveCart(db)
      const itemId = params.itemId as CartItemId
      const item = cart.items.find((candidate) => candidate.id === itemId)
      if (!item) throw notFoundError('cart_item', 'Item do carrinho não encontrado.')

      const nft = db.nfts.find((candidate) => candidate.id === item.nftId)
      const edition = nft?.editions.find((candidate) => candidate.id === item.editionId)
      const availableQuantity = edition?.availableQuantity ?? item.availableQuantity
      if (body.quantity > availableQuantity) {
        throw conflictError('STOCK_UNAVAILABLE', 'Quantidade solicitada acima do estoque disponível desta edição.')
      }

      item.quantity = body.quantity
      item.availableQuantity = availableQuantity
      if (edition) item.unitPriceEth = edition.priceEth
      item.subtotalEth = mulEthByQuantity(item.unitPriceEth, body.quantity)
      cart.updatedAt = new Date().toISOString()
      persistDb(db)

      const response: CartResponse = cart
      return HttpResponse.json(response)
    }),
  ),

  http.delete(
    '/api/cart/items/:itemId',
    withScenario('cart.removeItem', async ({ params }) => {
      const db = await getDb()
      const cart = resolveActiveCart(db)
      const itemId = params.itemId as CartItemId
      const index = cart.items.findIndex((candidate) => candidate.id === itemId)
      if (index === -1) throw notFoundError('cart_item', 'Item do carrinho não encontrado.')

      cart.items.splice(index, 1)
      cart.updatedAt = new Date().toISOString()
      persistDb(db)

      const response: CartResponse = cart
      return HttpResponse.json(response)
    }),
  ),
]
