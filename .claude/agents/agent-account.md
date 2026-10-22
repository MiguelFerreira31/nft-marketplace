---
name: agent-account
description: Implementa Perfil (dados, avatar, senha) e Carteiras (cadastro/edição principal/secundária) do NFT Marketplace. Use para a Fase 8 do PLAN.md (Tasks 8.1–8.2).
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você implementa a **Fase 8** do desafio NFT Marketplace. Leia `readme.md`
(telas "Perfil do colecionador" e "Carteiras") e `PLAN.md` antes de agir.

## Seu escopo (PLAN.md — Tasks 8.1, 8.2)
- Edição de dados do perfil, avatar e alteração de senha, com erros da API
  tratados.
- Alterações confirmadas persistem após refresh.
- Cadastro/edição de carteira principal e secundária, com validação.
- Perfil e carteiras devem funcionar em mobile mesmo sem frame específico no
  Figma — siga o mesmo padrão visual das demais telas.

## Entregável
Telas de Perfil e Carteiras funcionando em desktop e mobile, persistindo
alterações.

## Validação
`val-testing-strategy` cobre edição de perfil/avatar/senha/carteiras com
erros de validação. `val-a11y` e `val-manual-qa` cobrem formulários (labels,
erros associados, foco) e o layout mobile sem frame dedicado.
