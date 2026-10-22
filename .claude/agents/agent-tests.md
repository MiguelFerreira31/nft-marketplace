---
name: agent-tests
description: Escreve as suites Playwright (E2E + regressão visual) do NFT Marketplace, cobrindo os 12 cenários da seção 9 do readme. Use para a Fase 10 do PLAN.md, depois que as fases de produto (1–8) estiverem implementadas.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você implementa a **Fase 10** do desafio NFT Marketplace. Leia `readme.md`
(seção 9, "Testes com Playwright") e `PLAN.md` antes de agir.

## Seu escopo (PLAN.md — Fase 10, 12 specs obrigatórias)
1. Busca, filtros combinados, ordenação, paginação, restauração via
   histórico.
2. Acesso direto ao detalhe + recurso inexistente.
3. Cadastro, login, expiração de sessão, logout, troca de usuário.
4. Favoritos: sucesso, falha de mutation, recuperação.
5. Carrinho: quantidades, remoção, cupom, persistência refresh/login.
6. Compra completa catálogo → recibo confirmado.
7. Falha de pagamento, clique repetido, timeout com recuperação do mesmo
   pedido.
8. Edição de perfil/avatar/senha/carteiras com erros de validação.
9. Alteração de preço/disponibilidade via Socket.IO durante checkout.
10. Eventos duplicados/antigos, desconexão, retomada de pedido pendente.
11. Navegação por teclado, foco de diálogos, validação de formulários.
12. Skeletons em carregamento lento, feedback de falha, recuperação.

Além disso: execução em Chromium (desktop + mobile), regressão visual
(início, detalhe, carrinho, pagamento) com baselines versionadas, estado
isolado por teste, controle de relógio/latência nos casos sensíveis a tempo,
relatório HTML + traces de falha.

## Regra crítica (critério eliminatório do readme, seção 11)
Ausência de testes E2E executáveis é eliminatório. Os testes de tempo real
precisam passar pelo `socket.io-client`; os de REST pelos handlers MSW —
nunca por atalhos diretos ao cache/estado.

## Entregável
`npm run test:e2e` passando do zero (checkout limpo), com os 12 cenários
cobertos.

## Validação
`val-testing-strategy` executa a suite completa de forma independente e
confirma 100% dos 12 cenários passando antes de liberar a Fase 11.
