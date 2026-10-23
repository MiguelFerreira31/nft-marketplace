import { describe, expect, it } from 'vitest'
import type { Cart, CartItem } from '@/shared/types'
import type { MockDb } from '../db/types'
import { computeQuote, findCartById } from './quote'

/**
 * `computeQuote` é a única fonte de subtotal/desconto/taxa/total (readme §3
 * "Carrinho": "...coerentes com a resposta da API" — nunca recalculados pela
 * UI). Só o campo `quoteState` de `MockDb` é exercitado aqui; os demais
 * campos do banco simulado são irrelevantes para esta função pura.
 */
function makeDb(quoteState: MockDb['quoteState'] = {}): MockDb {
  return { quoteState } as unknown as MockDb
}

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'cart-item-1' as CartItem['id'],
    nftId: 'nft-1' as CartItem['nftId'],
    editionId: 'edition-1' as CartItem['editionId'],
    title: 'Aurora Fragmentada',
    coverImageUrl: 'https://example.test/cover.png',
    unitPriceEth: '1.0',
    quantity: 2,
    availableQuantity: 10,
    subtotalEth: '2.0',
    ...overrides,
  }
}

function makeCart(items: CartItem[], couponCode: string | null = null, id = 'cart-1'): Cart {
  return { id, items, couponCode, updatedAt: '2026-01-01T00:00:00.000Z' }
}

describe('findCartById', () => {
  it('finds the guest cart by id', () => {
    const guestCart = makeCart([])
    const db = { guestCart, users: [] } as unknown as MockDb
    expect(findCartById(db, 'cart-1')).toBe(guestCart)
  })

  it('finds a user cart by id', () => {
    const userCart = makeCart([], null, 'cart-user-ana')
    const db = {
      guestCart: makeCart([], null, 'guest'),
      users: [{ cart: userCart }],
    } as unknown as MockDb
    expect(findCartById(db, userCart.id)).toBe(userCart)
  })

  it('returns null when no cart matches', () => {
    const db = { guestCart: makeCart([]), users: [] } as unknown as MockDb
    expect(findCartById(db, 'does-not-exist')).toBeNull()
  })
})

describe('computeQuote', () => {
  it('sums subtotal from line items and adds the flat network fee when the cart has items', () => {
    const cart = makeCart([makeItem({ subtotalEth: '2.0' }), makeItem({ id: 'cart-item-2' as CartItem['id'], subtotalEth: '0.5' })])
    const quote = computeQuote(makeDb(), cart, null)

    expect(quote.subtotalEth).toBe('2.5')
    expect(quote.discountEth).toBe('0')
    expect(quote.networkFeeEth).toBe('0.0021')
    expect(quote.totalEth).toBe('2.5021')
    expect(quote.couponDiscountPercent).toBeNull()
  })

  it('applies a coupon discount percent to the subtotal before the network fee', () => {
    const cart = makeCart([makeItem({ subtotalEth: '2.0' })], 'BEMVINDO10')
    const quote = computeQuote(makeDb(), cart, 10)

    expect(quote.discountEth).toBe('0.2')
    expect(quote.totalEth).toBe('1.8021')
  })

  it('has no network fee for an empty cart', () => {
    const quote = computeQuote(makeDb(), makeCart([]), null)
    expect(quote.subtotalEth).toBe('0')
    expect(quote.networkFeeEth).toBe('0')
    expect(quote.totalEth).toBe('0')
  })

  it('flags a line item as unavailable when quantity exceeds current stock', () => {
    const cart = makeCart([makeItem({ quantity: 5, availableQuantity: 1 })])
    const quote = computeQuote(makeDb(), cart, null)
    expect(quote.items[0].available).toBe(false)
  })

  it('keeps the same quoteVersion across reads while nothing material changes', () => {
    const quoteState: MockDb['quoteState'] = {}
    const db = makeDb(quoteState)
    const cart = makeCart([makeItem()])

    const first = computeQuote(db, cart, null)
    const second = computeQuote(db, cart, null)
    expect(second.quoteVersion).toBe(first.quoteVersion)
  })

  it('bumps quoteVersion when the item fingerprint changes (e.g. price or quantity drift)', () => {
    const quoteState: MockDb['quoteState'] = {}
    const db = makeDb(quoteState)
    const cart = makeCart([makeItem()])

    const first = computeQuote(db, cart, null)
    cart.items[0].unitPriceEth = '2.0'
    cart.items[0].subtotalEth = '4.0'
    const second = computeQuote(db, cart, null)
    expect(second.quoteVersion).toBe(first.quoteVersion + 1)
  })

  it('bumps quoteVersion when a coupon is applied even if the items stay the same', () => {
    const quoteState: MockDb['quoteState'] = {}
    const db = makeDb(quoteState)
    const cart = makeCart([makeItem()])

    const withoutCoupon = computeQuote(db, cart, null)
    const withCoupon = computeQuote(db, cart, 10)
    expect(withCoupon.quoteVersion).toBe(withoutCoupon.quoteVersion + 1)
  })
})
