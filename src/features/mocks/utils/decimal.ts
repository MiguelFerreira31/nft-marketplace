import type { EthAmount } from '@/shared/types'

/**
 * Aritmética decimal exata para `EthAmount` (strings decimais, seção 3.2 de
 * `ARCHITECTURE.md`). Usada EXCLUSIVAMENTE dentro do MSW para calcular
 * subtotal/desconto/taxa/total — a UI nunca deve reimplementar isto; ela só
 * formata o que a API (aqui, o mock) já devolveu.
 *
 * Implementação com `bigint` em ponto fixo (18 casas decimais, como wei) para
 * nunca depender de ponto flutuante binário.
 */
const SCALE_DECIMALS = 18
const SCALE = 10n ** BigInt(SCALE_DECIMALS)

/** Converte uma string decimal ("1.5", "0.001", "120") para unidades fixas (bigint). */
export function toUnits(value: EthAmount): bigint {
  const trimmed = value.trim()
  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed
  const [wholePart = '0', fractionPartRaw = ''] = unsigned.split('.')
  const fractionPart = fractionPartRaw.slice(0, SCALE_DECIMALS).padEnd(SCALE_DECIMALS, '0')
  const whole = BigInt(wholePart === '' ? '0' : wholePart)
  const fraction = BigInt(fractionPart === '' ? '0' : fractionPart)
  const units = whole * SCALE + fraction
  return negative ? -units : units
}

/** Converte unidades fixas (bigint) de volta para string decimal, sem zeros à direita supérfluos. */
export function fromUnits(units: bigint): EthAmount {
  const negative = units < 0n
  const absolute = negative ? -units : units
  const whole = absolute / SCALE
  const fraction = absolute % SCALE
  const fractionStr = fraction.toString().padStart(SCALE_DECIMALS, '0').replace(/0+$/, '')
  const sign = negative && (whole !== 0n || fractionStr !== '') ? '-' : ''
  return fractionStr === '' ? `${sign}${whole}` : `${sign}${whole}.${fractionStr}`
}

export function addEth(a: EthAmount, b: EthAmount): EthAmount {
  return fromUnits(toUnits(a) + toUnits(b))
}

export function subEth(a: EthAmount, b: EthAmount): EthAmount {
  return fromUnits(toUnits(a) - toUnits(b))
}

export function sumEth(values: EthAmount[]): EthAmount {
  return fromUnits(values.reduce((total, value) => total + toUnits(value), 0n))
}

/** Multiplica um `EthAmount` por uma quantidade inteira (ex.: `unitPriceEth * quantity`). */
export function mulEthByQuantity(unitPrice: EthAmount, quantity: number): EthAmount {
  return fromUnits(toUnits(unitPrice) * BigInt(quantity))
}

/** Aplica um desconto percentual inteiro (0-100) sobre um `EthAmount`, truncando a fração restante. */
export function applyPercent(value: EthAmount, percent: number): EthAmount {
  const units = toUnits(value)
  return fromUnits((units * BigInt(Math.round(percent * 100))) / 10_000n)
}

export function isGreaterOrEqual(a: EthAmount, b: EthAmount): boolean {
  return toUnits(a) >= toUnits(b)
}

export function isZero(value: EthAmount): boolean {
  return toUnits(value) === 0n
}
