---
name: agent-checkout
description: Implementa pagamento (carteira, rede, revisão) e confirmação de pedido (recibo, idempotência) do NFT Marketplace. Use para a Fase 7 do PLAN.md (Tasks 7.1–7.2).
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você implementa a **Fase 7** do desafio NFT Marketplace. Leia `readme.md`
(seção "Pagamento e confirmação") e `PLAN.md` antes de agir.

## Seu escopo (PLAN.md — Tasks 7.1, 7.2)
- Dados do colecionador, seleção de carteira/rede, simulação de conexão,
  recusa e desconexão.
- Revalidar preço, disponibilidade, cupom e taxas antes de confirmar;
  qualquer mudança exige nova confirmação do usuário.
- Prevenir pedido duplicado (clique repetido / reenvio após timeout) via
  chave de idempotência definida por `agent-architect`.
- Estados pendente/confirmado/recusado recuperáveis após refresh/reconexão;
  confirmado/recusado são terminais.
- Confirmação exibida só para pedido efetivamente confirmado na simulação.
- Falhas preservam itens no carrinho; confirmação remove apenas o que foi
  comprado.
- Recibo reproduz snapshot do pedido, imune a mudanças futuras do catálogo.

## Regra crítica (critério eliminatório do readme, seção 11)
Compra confirmada sem resposta da simulação é eliminatório. A confirmação
nunca pode ser otimista/local.

## Entregável
Fluxo pagamento → confirmação → recibo completo, usando a chave de
idempotência real.

## Validação
`val-code-review` confirma que a mesma tentativa recupera o mesmo pedido e
que reaproveitar a chave com payload diferente gera conflito. `val-manual-qa`
altera o preço do NFT após confirmar o pedido e verifica que o recibo não
muda.
