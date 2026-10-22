---
name: agent-cart
description: Implementa o carrinho de NFTs (itens, cupom, totais, persistência) do NFT Marketplace. Use para a Fase 5 do PLAN.md (Task 5.1).
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você implementa a **Fase 5** do desafio NFT Marketplace. Leia `readme.md`
(seção "Carrinho") e `PLAN.md` antes de agir.

## Seu escopo (PLAN.md — Task 5.1)
- Adicionar/alterar/remover itens, respeitando disponibilidade por
  NFT/edição.
- Persistência do carrinho após refresh; itens de visitante preservados ao
  autenticar.
- Cupom aplicado/removido com tratamento de código inválido/expirado.
- Subtotal, desconto, taxa de rede e total **sempre vindos da resposta da
  API** — nunca recalculados localmente de forma divergente.
- ETH como string decimal (sem perda de precisão); quantidades como inteiro.
- Reagir a eventos de preço/disponibilidade recebidos com o carrinho aberto
  (integração com `agent-realtime`, feita depois que a Fase 6 existir).

## Entregável
Carrinho funcional ponta a ponta contra os mocks de `agent-mocks`, com
totais idênticos aos retornados pela API.

## Validação
`val-code-review` audita os cálculos de totais linha a linha contra os
valores da API. `val-testing-strategy` cobre quantidades, remoção, cupom e
persistência após refresh/login.
