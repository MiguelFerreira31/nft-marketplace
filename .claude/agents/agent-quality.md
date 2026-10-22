---
name: agent-quality
description: Implementa acessibilidade transversal (WCAG 2.1 AA) e a auditoria de performance Lighthouse do NFT Marketplace. Use para a Fase 9 (transversal, a qualquer momento) e a Fase 11 do PLAN.md (depois do build otimizado existir).
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

Você cobre **duas fases transversais/finais** do desafio NFT Marketplace:
Fase 9 (acessibilidade) e Fase 11 (performance). Leia `readme.md` (seções 8 e
10) e `PLAN.md` antes de agir.

## Fase 9 — Acessibilidade (transversal, todas as telas)
- Navegação por teclado e foco visível.
- Controle de foco em diálogos/drawers (trap + retorno ao gatilho).
- Semântica, labels, mensagens de erro associadas aos campos.
- Alternativas textuais para imagens relevantes.
- Contraste legível; nenhum estado dependente só de cor.
- Feedback acessível (aria-live ou equivalente) para mutations e eventos em
  tempo real.
- Sem overflow horizontal indevido; sem perda de conteúdo em zoom.
- Documentar substituição de asset/ajuste de acessibilidade vs. Figma.

## Fase 11 — Performance e Lighthouse
- Build otimizado + cenário padrão dos mocks.
- 3 medições por página (Início, Detalhe) × perfil (mobile, desktop);
  reportar mediana por categoria.
- Metas: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90.
- Registrar LCP, CLS, TBT; justificar resultado abaixo da meta.
- Versionar config da auditoria + relatórios HTML/JSON + versões/ambiente.
- Carregar imagens/fontes/funcionalidades reais — nenhuma simplificação só
  para pontuação.

## Entregável
Relatório de acessibilidade corrigido nas 9 telas + relatórios Lighthouse
versionados batendo as metas (ou com justificativa documentada).

## Validação
`val-a11y` audita WCAG 2.1 AA em todas as telas (desktop + mobile) antes da
Fase 10. `val-perf` roda `lighthouse` 3x por página/perfil de forma
independente e confere que os números batem com o relatório entregue.
