import type { CreateOrderRequest, IdempotencyKey, OrderId, UserId } from '@/shared/types'

export interface CheckoutAttempt {
  idempotencyKey: IdempotencyKey
  payload: CreateOrderRequest
  orderId?: OrderId
}

function storageKey(userId: UserId) {
  return `marketplace.checkout-attempt:${userId}`
}

export function readCheckoutAttempt(userId: UserId): CheckoutAttempt | null {
  try {
    const value = localStorage.getItem(storageKey(userId))
    return value ? (JSON.parse(value) as CheckoutAttempt) : null
  } catch {
    return null
  }
}

export function saveCheckoutAttempt(userId: UserId, attempt: CheckoutAttempt): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(attempt))
  } catch {
    // Keep the in-memory attempt usable when browser storage is unavailable.
  }
}

export function clearCheckoutAttempt(userId: UserId, orderId?: OrderId): void {
  const attempt = readCheckoutAttempt(userId)
  if (orderId && attempt?.orderId !== orderId) return
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // Nothing to clear when browser storage is unavailable.
  }
}
