import { HttpResponse, http } from 'msw'
import type { ApplyCouponResponse, QuoteResponse, RemoveCouponResponse } from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import type { MockDb } from '../db/types'
import { conflictError, notFoundError } from '../utils/http-error'
import { computeQuote, findCartById } from '../utils/quote'
import { withScenario } from '../utils/with-scenario'

function couponDiscountPercent(db: MockDb, code: string | null): number | null {
  if (!code) return null
  const coupon = db.coupons.find((candidate) => candidate.code === code)
  return coupon?.discountPercent ?? null
}

export const quoteHandlers = [
  http.get(
    '/api/carts/:cartId/quote',
    withScenario('quote.get', async ({ params }) => {
      const db = await getDb()
      const cart = findCartById(db, String(params.cartId))
      if (!cart) throw notFoundError('cart_item', 'Carrinho não encontrado.')

      const response: QuoteResponse = computeQuote(db, cart, couponDiscountPercent(db, cart.couponCode))
      persistDb(db)
      return HttpResponse.json(response)
    }),
  ),

  http.post(
    '/api/carts/:cartId/coupon',
    withScenario('quote.applyCoupon', async ({ request, params }) => {
      const db = await getDb()
      const cart = findCartById(db, String(params.cartId))
      if (!cart) throw notFoundError('cart_item', 'Carrinho não encontrado.')

      const body = (await request.json()) as { code: string }
      const code = body.code?.trim().toUpperCase()
      const coupon = db.coupons.find((candidate) => candidate.code === code)
      if (!coupon) throw notFoundError('coupon', 'Cupom inválido.')

      const expired = coupon.expiresAt !== null && new Date(coupon.expiresAt).getTime() < Date.now()
      const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses
      if (expired || exhausted) {
        throw conflictError('COUPON_UNAVAILABLE', expired ? 'Este cupom expirou.' : 'Este cupom atingiu o limite de uso.')
      }

      cart.couponCode = coupon.code
      cart.updatedAt = new Date().toISOString()

      const response: ApplyCouponResponse = computeQuote(db, cart, coupon.discountPercent)
      persistDb(db)
      return HttpResponse.json(response)
    }),
  ),

  http.delete(
    '/api/carts/:cartId/coupon',
    withScenario('quote.removeCoupon', async ({ params }) => {
      const db = await getDb()
      const cart = findCartById(db, String(params.cartId))
      if (!cart) throw notFoundError('cart_item', 'Carrinho não encontrado.')

      cart.couponCode = null
      cart.updatedAt = new Date().toISOString()

      const response: RemoveCouponResponse = computeQuote(db, cart, null)
      persistDb(db)
      return HttpResponse.json(response)
    }),
  ),
]
