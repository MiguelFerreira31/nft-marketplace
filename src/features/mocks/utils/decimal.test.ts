import { describe, expect, it } from 'vitest'
import {
  addEth,
  applyPercent,
  fromUnits,
  isGreaterOrEqual,
  isZero,
  mulEthByQuantity,
  subEth,
  sumEth,
  toUnits,
} from './decimal'

/**
 * Aritmética ETH em `bigint` (ver `decimal.ts`) — nenhuma camada fora do MSW
 * reimplementa isto (seção 3.2 de `ARCHITECTURE.md`), então estes são os
 * únicos testes que exercitam diretamente a precisão decimal usada por
 * `quote.ts`/`cart.ts` para subtotal/desconto/taxa/total.
 */
describe('toUnits/fromUnits round-trip', () => {
  it('preserves whole numbers', () => {
    expect(fromUnits(toUnits('120'))).toBe('120')
  })

  it('preserves fractional values without binary float drift', () => {
    expect(fromUnits(toUnits('0.1'))).toBe('0.1')
    expect(fromUnits(toUnits('0.001'))).toBe('0.001')
  })

  it('truncates precision beyond 18 decimal places instead of rounding', () => {
    expect(fromUnits(toUnits('1.1234567890123456789'))).toBe('1.123456789012345678')
  })

  it('round-trips negative values', () => {
    expect(fromUnits(toUnits('-0.5'))).toBe('-0.5')
  })

  it('never renders "-0" for a value that truncates to zero', () => {
    expect(fromUnits(toUnits('-0'))).toBe('0')
  })

  it('treats an empty fractional part as zero', () => {
    expect(fromUnits(toUnits('42.'))).toBe('42')
  })
})

describe('addEth/subEth', () => {
  it('adds without the classic 0.1 + 0.2 binary float error', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
  })

  it('subtracts exactly', () => {
    expect(subEth('0.3', '0.1')).toBe('0.2')
  })

  it('supports results that cross zero into negative', () => {
    expect(subEth('1', '1.5')).toBe('-0.5')
  })
})

describe('sumEth', () => {
  it('sums a list of line-item subtotals', () => {
    expect(sumEth(['1.6721', '0.0021', '0.5'])).toBe('2.1742')
  })

  it('returns "0" for an empty list', () => {
    expect(sumEth([])).toBe('0')
  })
})

describe('mulEthByQuantity', () => {
  it('multiplies a unit price by an integer quantity exactly', () => {
    expect(mulEthByQuantity('0.1', 3)).toBe('0.3')
  })

  it('returns "0" for a zero quantity', () => {
    expect(mulEthByQuantity('1.5', 0)).toBe('0')
  })
})

describe('applyPercent', () => {
  it('applies an integer percent discount', () => {
    expect(applyPercent('10', 10)).toBe('1')
  })

  it('supports a fractional percent (e.g. a future 12.5% coupon)', () => {
    expect(applyPercent('100', 12.5)).toBe('12.5')
  })

  it('truncates the remaining fraction instead of rounding up', () => {
    expect(applyPercent('1', 33)).toBe('0.33')
    expect(applyPercent('0.01', 10)).toBe('0.001')
  })

  it('returns "0" for a 0% discount', () => {
    expect(applyPercent('5', 0)).toBe('0')
  })
})

describe('isGreaterOrEqual', () => {
  it('compares decimal strings by value, not lexicographically', () => {
    expect(isGreaterOrEqual('0.2', '0.1')).toBe(true)
    expect(isGreaterOrEqual('0.1', '0.2')).toBe(false)
    expect(isGreaterOrEqual('1', '1')).toBe(true)
    // Lexicographic comparison would get this wrong ("0.9" > "0.10").
    expect(isGreaterOrEqual('0.10', '0.9')).toBe(false)
  })
})

describe('isZero', () => {
  it('detects zero regardless of formatting', () => {
    expect(isZero('0')).toBe(true)
    expect(isZero('0.000')).toBe(true)
    expect(isZero('0.0001')).toBe(false)
  })
})
