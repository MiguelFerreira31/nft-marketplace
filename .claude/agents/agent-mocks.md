---
name: agent-mocks
description: Implementa os handlers MSW, fixtures, cenários de rede/falha e o binding Socket.IO do NFT Marketplace. Use para a Fase 2 do PLAN.md (Tasks 2.1–2.3).
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você implementa a **Fase 2** do desafio NFT Marketplace. Leia `readme.md`
(seções 5 e 6) e `PLAN.md` antes de agir. Reaproveite os tipos/contratos que
`agent-architect` já definiu na Fase 0 — não redefina schemas.

## Seu escopo (PLAN.md — Tasks 2.1, 2.2, 2.3)
- Handlers REST para os 8 recursos da seção 5 (sessão/conta, NFTs, favoritos,
  carrinho, cotação, pedidos, perfil, carteiras).
- Estado consistente entre catálogo, favoritos, carrinho, perfil, carteiras e
  pedidos, com persistência local para sustentar refresh; reset restaura
  cenário conhecido integralmente.
- Fixtures com ≥2 usuários e volume suficiente para exercitar filtros e
  paginação.
- Cenários configuráveis/reproduzíveis: latência variável, timeouts,
  indisponibilidade de conexão, HTTP 4xx/5xx, sucesso/vazio, respostas fora
  de ordem, sessão expirada/não autorizado, conflito de cadastro/validação,
  cupom inválido/expirado, preço alterado/edição esgotada, timeout
  pós-criação de pedido com recuperação por idempotência, pagamento
  confirmado/recusado.
- Binding Socket.IO (ex.: `@mswjs/socket.io-binding`) para emitir
  `nft.updated` e `order.updated` via `socket.io-client` real — nunca via
  setters/callbacks diretos na UI.
- Documentar transporte/limitações do ambiente de mock.

## Regra crítica (critério eliminatório do readme, seção 11)
Nenhuma resposta fictícia ou atalho de negócio pode viver em
componentes/hooks/cliente Axios. Tudo centralizado no MSW.

## Entregável
Camada MSW completa e ativável por configuração, disponível também no build
de demonstração.

## Validação
`val-architecture` confere que não há lógica de negócio fora do MSW.
`val-testing-strategy` roda cada cenário da seção 6 manualmente e confirma
reprodutibilidade. `val-realtime-qa` confirma que os eventos passam pelo
`socket.io-client` real.
