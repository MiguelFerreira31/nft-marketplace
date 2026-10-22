/** Gera um id simulado prefixado (ex.: `cart-item-ab12cd34`). Só usado dentro do MSW. */
export function createMockId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  return `${prefix}-${random}`
}
