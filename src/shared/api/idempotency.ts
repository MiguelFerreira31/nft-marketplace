import type { IdempotencyKey } from '@/shared/types'

/**
 * Gera uma chave de idempotência para UMA tentativa de criação de pedido
 * (ver contrato completo em `src/shared/types/orders.ts`). O chamador
 * (`agent-checkout`, Fase 7) deve:
 *
 * 1. Chamar isto UMA vez ao iniciar a tentativa de checkout (ex.: ao montar
 *    a tela de revisão/pagamento, ou ao clicar em "confirmar compra" pela
 *    primeira vez) e guardar o valor (estado local/React Query mutation
 *    variables) — não gerar uma chave nova por clique.
 * 2. Reenviar a MESMA chave em cliques repetidos e em retries automáticos
 *    após timeout da mesma tentativa.
 * 3. Gerar uma chave NOVA somente quando o usuário alterar o carrinho/cotação
 *    e iniciar uma tentativa de compra diferente.
 */
export function createIdempotencyKey(): IdempotencyKey {
  return crypto.randomUUID() as IdempotencyKey
}
