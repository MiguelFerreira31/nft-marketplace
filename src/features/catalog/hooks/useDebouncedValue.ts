import { useEffect, useState } from 'react'

/**
 * Debounce genérico de valor — usado pelos campos de busca/preço do
 * catálogo (`CatalogToolbar`) para não disparar uma navegação (e portanto
 * uma nova entrada no histórico + requisição) a cada tecla digitada.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
