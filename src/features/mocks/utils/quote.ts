import type { Cart, Quote, QuoteItem } from '@/shared/types'
import type { MockDb } from '../db/types'
import { addEth, applyPercent, subEth, sumEth } from './decimal'

const NETWORK_FEE_ETH = '0.0021'
const QUOTE_TTL_MS = 2 * 60 * 1000

/** Localiza um carrinho (de visitante ou de qualquer usuário) pelo `Cart.id` usado como `cartId` na URL da cotação. */
export function findCartById(db: MockDb, cartId: string): Cart | null {
  if (db.guestCart.id === cartId) return db.guestCart
  const user = db.users.find((candidate) => candidate.cart.id === cartId)
  return user?.cart ?? null
}

function fingerprintOf(cart: Cart): string {
  const itemsFingerprint = cart.items
    .map((item) => `${item.editionId}:${item.quantity}:${item.unitPriceEth}:${item.availableQuantity}`)
    .sort()
    .join('|')
  return `${itemsFingerprint}#${cart.couponCode ?? ''}`
}

/** Lê (ou inicia) a `quoteVersion` do carrinho — incrementa só quando o fingerprint muda (ver `db/types.ts`). */
function nextQuoteVersion(db: MockDb, cart: Cart): number {
  const fingerprint = fingerprintOf(cart)
  const previous = db.quoteState[cart.id]
  const version = previous && previous.fingerprint === fingerprint ? previous.version : (previous?.version ?? 0) + 1
  db.quoteState[cart.id] = { fingerprint, version }
  return version
}

export function computeQuote(db: MockDb, cart: Cart, couponDiscountPercent: number | null): Quote {
  const items: QuoteItem[] = cart.items.map((item) => ({
    editionId: item.editionId,
    quantity: item.quantity,
    unitPriceEth: item.unitPriceEth,
    subtotalEth: item.subtotalEth,
    available: item.quantity <= item.availableQuantity,
  }))

  const subtotalEth = sumEth(items.map((item) => item.subtotalEth))
  const discountEth = couponDiscountPercent ? applyPercent(subtotalEth, couponDiscountPercent) : '0'
  const networkFeeEth = items.length > 0 ? NETWORK_FEE_ETH : '0'
  const totalEth = addEth(subEth(subtotalEth, discountEth), networkFeeEth)

  return {
    cartId: cart.id,
    items,
    couponCode: cart.couponCode,
    couponDiscountPercent,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    quoteVersion: nextQuoteVersion(db, cart),
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
}
