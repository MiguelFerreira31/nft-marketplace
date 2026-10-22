import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/http'

/**
 * Instância única do `QueryClient`. A política completa (staleTime por
 * recurso, retries, cancelamento, isolamento por usuário) está documentada
 * em `ARCHITECTURE.md` — os defaults abaixo implementam a parte que é igual
 * para todo recurso; overrides específicos (ex.: `refetchInterval` de
 * pedido pendente) são feitos por hook, não aqui.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s: equilíbrio entre "não bater na API a cada render" e dados
      // razoavelmente frescos para um catálogo que também recebe eventos
      // Socket.IO (`nft.updated`) para mudanças em tempo real.
      staleTime: 30_000,
      // GC generoso o suficiente para manter cache "morno" ao navegar entre
      // catálogo ↔ detalhe ↔ carrinho sem refetch imediato.
      gcTime: 5 * 60_000,
      // Nunca retry em erro de validação/sessão/permissão/404/conflito —
      // só em falha transitória/rede, que é retryable por natureza.
      retry: (failureCount, error) => {
        if (isApiError(error)) {
          const body = error.response?.data.error
          if (body?.code !== 'TRANSIENT_ERROR') return false
        }
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations nunca retry automaticamente por padrão — ver política de
      // idempotência específica de `POST /orders` (não é retry genérico do
      // Query, é reenvio controlado com a mesma `Idempotency-Key`).
      retry: false,
    },
  },
})
