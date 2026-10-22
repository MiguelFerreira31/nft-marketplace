import type { IsoDateTime } from '@/shared/types'

export interface CouponFixture {
  code: string
  discountPercent: number
  /** `null` = sem expiração. */
  expiresAt: IsoDateTime | null
  maxUses: number | null
  usedCount: number
}

/**
 * Cupons simulados — a disponibilidade (seção 6: "cupom inválido ou
 * expirado") é inteiramente determinada pelos dados abaixo, sem precisar de
 * nenhum toggle de cenário:
 *
 * - `BEMVINDO10`  — válido, 10% de desconto, sem expiração/limite de uso.
 * - `PROMO20`     — válido, 20% de desconto, expira em 2027 (longe no futuro).
 * - `EXPIRADO15`  — código existe, mas `expiresAt` já passou → 409 CONFLICT
 *   `COUPON_UNAVAILABLE` ao aplicar.
 * - `ESGOTADO5`   — código existe, mas `usedCount === maxUses` → 409 CONFLICT
 *   `COUPON_UNAVAILABLE` (limite de uso atingido).
 * - qualquer outro código (ex.: `NAOEXISTE`) → 404 NOT_FOUND `coupon`
 *   (cupom inválido/inexistente).
 */
export function buildCouponFixtures(): CouponFixture[] {
  return [
    { code: 'BEMVINDO10', discountPercent: 10, expiresAt: null, maxUses: null, usedCount: 0 },
    { code: 'PROMO20', discountPercent: 20, expiresAt: '2027-12-31T23:59:59.000Z', maxUses: 100, usedCount: 3 },
    { code: 'EXPIRADO15', discountPercent: 15, expiresAt: '2026-01-01T00:00:00.000Z', maxUses: null, usedCount: 0 },
    { code: 'ESGOTADO5', discountPercent: 5, expiresAt: null, maxUses: 1, usedCount: 1 },
  ]
}
