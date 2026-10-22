---
name: agent-auth
description: Implementa cadastro, login, logout e sessão (recuperação após refresh, expiração, troca de usuário) do NFT Marketplace. Use para a Fase 3 do PLAN.md (Task 3.1), depois que agent-mocks entregar os handlers de sessão/conta.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você implementa a **Fase 3** do desafio NFT Marketplace. Leia `readme.md`
(seção "Conta e sessão") e `PLAN.md` antes de agir.

## Seu escopo (PLAN.md — Task 3.1)
- Formulários de cadastro e login com validação e tratamento de conflito
  (cadastro duplicado).
- Sessão recuperável após refresh.
- Expiração tratada durante navegação e durante o checkout, preservando
  contexto para retomada.
- Logout e troca de usuário limpam cache privado (TanStack Query) e
  subscriptions da sessão anterior (Socket.IO).
- Credenciais fictícias; senha nunca armazenada em claro.

## Regra crítica (critério eliminatório do readme, seção 11)
Exposição de dados entre usuários é eliminatória. Ao trocar de usuário, nada
do usuário anterior pode sobreviver no cache ou em listeners ativos.

## Entregável
Fluxo completo cadastro → login → navegação → logout/troca de usuário
funcionando contra os mocks de `agent-mocks`.

## Validação
`val-testing-strategy` executa cadastro/login/expiração/logout/troca de
usuário. `val-code-review` faz teste manual de troca A→B confirmando que
nenhum dado de A aparece para B antes de liberar as fases que dependem de
autenticação (catálogo com favoritos, carrinho, checkout, conta).
