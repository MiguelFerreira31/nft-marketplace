# Agentes do projeto — NFT Marketplace

Este arquivo é o índice de contexto persistente para quem (humano ou IA)
orquestra as fases do desafio descrito em `DESAFIO.md` e detalhado em
`PLAN.md`. Leia os dois antes de invocar qualquer agente — eles não são
repetidos aqui.

As definições reais dos agentes (as que o Claude Code carrega como
`subagent_type` selecionável via `Agent`) ficam em `.claude/agents/*.md`,
escopadas a este projeto. Cada arquivo já embute o recorte de `PLAN.md` e
`DESAFIO.md` relevante para aquele papel, então invocar pelo nome evita
reexplicar contexto a cada chamada — essa é a "forma otimizada de consumo":
chame pelo `subagent_type`, não copie trechos do plano na prompt.

## Roster — executores (`.claude/agents/`)

| subagent_type | Fase (PLAN.md) | Escopo resumido |
| --- | --- | --- |
| `agent-architect` | 0 | Setup, contratos REST/tipos, política de cache/retry/idempotência |
| `agent-shell` | 1 | Rotas, guards, layout responsivo, design tokens, skeletons |
| `agent-mocks` | 2 | Handlers MSW, fixtures, cenários de falha, binding Socket.IO |
| `agent-auth` | 3 | Cadastro, login, logout, sessão |
| `agent-catalog` | 4 | Início (busca/filtros/paginação) e Detalhe do NFT, favoritos |
| `agent-cart` | 5 | Carrinho, cupom, totais, persistência |
| `agent-realtime` | 6 | Cliente Socket.IO, reconciliação REST↔eventos |
| `agent-checkout` | 7 | Pagamento, idempotência, confirmação, recibo |
| `agent-account` | 8 | Perfil, avatar, senha, carteiras |
| `agent-tests` | 10 | Suites Playwright (12 cenários da seção 9 do readme) |
| `agent-quality` | 9 e 11 | Acessibilidade transversal + Lighthouse |
| `agent-devops` | 12 | README/ARCHITECTURE finais, deploy público |

## Roster — validadores

Regra fixa: **quem implementa uma task nunca é quem a valida.** Todo gate do
`PLAN.md` exige um validador diferente do agente executor.

| Validador | Como invocar | O que audita |
| --- | --- | --- |
| `val-architecture` | agente `general-purpose` + skill `engineering:architecture` | Coerência de contratos/tipos (Fase 0, 2) |
| `val-code-review` | agente `general-purpose` + skill `engineering:code-review` (effort alto) | Correção, segurança, cálculos, idempotência |
| `val-a11y` | agente `general-purpose` + skill `design:accessibility-review` | WCAG 2.1 AA (Fase 9) |
| `val-testing-strategy` | agente `general-purpose` + skill `engineering:testing-strategy` | Cobertura real dos cenários (seções 6 e 9) |
| `val-deploy` | agente `general-purpose` + skill `engineering:deploy-checklist` | Checkout limpo, build de demo, URL pública |
| `val-realtime-qa` | `.claude/agents/val-realtime-qa.md` (subagent_type próprio) | Duplicidade/ordem de evento, reconexão, isolamento por sessão |
| `val-manual-qa` | `.claude/agents/val-manual-qa.md` (subagent_type próprio) | Fidelidade ao Figma, responsividade, roteiros funcionais |
| `val-perf` | `.claude/agents/val-perf.md` (subagent_type próprio) | Métricas Lighthouse reproduzidas de forma independente |

Os cinco primeiros validadores não têm arquivo próprio porque já existe uma
skill do repositório que cobre exatamente aquele checklist — duplicar a
definição seria redundante. Os três últimos têm arquivo próprio porque
envolvem rodar a aplicação/ferramentas e checklist específico do desafio, sem
skill equivalente pronta.

## Como consumir isso de forma otimizada

1. **Siga a ordem das fases do `PLAN.md`.** Fases de produto (3–8) dependem
   da Fase 0 (contratos) e em parte da Fase 2 (mocks). Não pule a ordem.
2. **Invoque pelo nome, não reescreva contexto.** Ex.:
   `Agent({ subagent_type: "agent-cart", description: "Implementa carrinho", prompt: "Implemente a Task 5.1 do PLAN.md." })`
   — o arquivo do agente já carrega o escopo; a prompt só precisa confirmar
   qual task/sub-task rodar agora.
3. **Nunca combine executor e validador na mesma chamada.** Depois que um
   `agent-*` termina, abra uma chamada nova para o `val-*` correspondente
   antes de marcar a task como concluída no `PLAN.md`.
4. **Paralelize apenas tasks sem dependência real.** Dentro da mesma fase,
   subtasks independentes (ex.: `agent-account` Task 8.1 e 8.2) podem rodar
   em paralelo. Fases diferentes quase sempre têm dependência sequencial
   (ver tabela de fases no `PLAN.md`).
5. **Use `fork` só para investigação/leitura que não precisa virar código
   compartilhado** (ex.: "essa resposta do MSW está no formato certo?").
   Para implementar ou validar uma task, use os `subagent_type` dedicados
   acima — eles têm `tools` e `model` já calibrados para o papel.
6. **Feche o Checklist eliminatório final do `PLAN.md`** (seção final do
   plano) antes de considerar o desafio pronto — ele reúne os critérios
   eliminatórios da seção 11 do `DESAFIO.md`.

## Instalação local (dentro de `.claude/` deste projeto)

Além de habilitadas globalmente, estas skills estão declaradas/vendorizadas
dentro de `C:\Users\Miguel\Pictures\desafio\.claude`, para que o projeto seja
autocontido:

- `.claude/settings.json` — declara `extraKnownMarketplaces` e
  `enabledPlugins` para `ponytail@ponytail`, `ecc@ecc`, `impeccable@impeccable`
  e `frontend-design@claude-plugins-official`. O código dos plugins em si
  continua compartilhado no cache global do Claude Code (`~/.claude/plugins/cache`)
  — isso é como o sistema de plugins funciona; o que fica local ao projeto é a
  declaração de que ele depende dessas skills, versionável junto do repo.
- `.claude/skills/` — cópias completas (vendorizadas) das skills dos plugins,
  sem depender da instalação global:
  - `graphify/`, `ui-ux-pro-max/` — skills completas.
  - `frontend-design/`, `impeccable/` — a skill principal de cada plugin.
  - `ponytail/` + `ponytail-audit/`, `ponytail-debt/`, `ponytail-gain/`,
    `ponytail-help/`, `ponytail-review/` — todas as skills do plugin ponytail.
  - `caveman/` + `cavecrew/`, `caveman-commit/`, `caveman-compress/`,
    `caveman-discover/`, `caveman-evidence-review/`, `caveman-explore/`,
    `caveman-help/`, `caveman-learn/`, `caveman-manage/`, `caveman-optimize/`,
    `caveman-review/`, `caveman-setup/`, `caveman-stats/`, `generated/`,
    `investigate-first/`, `lean-build/`, `megacave/`, `migration/`,
    `native/`, `safe-refactor/`, `surgical-patch/`, `ultracave/`,
    `verify-and-stop/` — todas as skills do plugin caveman.
  - `ecc-guide/` — apenas a skill de entrada do ECC (não os 311 skills do
    catálogo completo): o plugin inteiro já está habilitado via
    `settings.json` acima, então vendorizar as 311 teria duplicado conteúdo
    sem relação com este desafio. `ecc-guide` basta para consultar o que o
    ECC oferece e como acionar o resto quando precisar.
- `.claude/agents/*.md` — os 15 subagentes do projeto (ver roster acima),
  nativos deste diretório.

### Caveman — aviso de comportamento

O `caveman` (recém-adicionado) muda a *voz* das respostas para um estilo
telegráfico ("answer first, fluff gone"), com comandos como `/caveman`,
`/ultracave`. Isso afeta como as respostas são escritas neste projeto a
partir de agora, não só o código gerado. Rode `/caveman-help` para ver os
níveis e `/caveman off` (ou o comando equivalente do plugin) se preferir
voltar ao estilo normal de resposta.

## Skills instaladas que apoiam este fluxo

- `ponytail` — mantém o código dos agentes executores minimalista (escreve só
  o necessário, nunca corta validação/segurança/acessibilidade). Ativo neste
  projeto.
- `ecc` — agentes/skills adicionais de planejamento, revisão, segurança e
  arquitetura disponíveis via `/ecc:*` e como `subagent_type` extras, caso um
  papel não cobrido pelo roster acima seja necessário. Ativo neste projeto
  (hooks desligados por padrão — ver `/plugin configure ecc@ecc` se quiser
  ativá-los).
- `graphify` — mapeia o código em um grafo consultável (`/graphify .`); útil
  para `val-architecture` e `val-code-review` entenderem relações entre
  arquivos sem reler tudo.
- `impeccable` — vocabulário de comandos de design (`/impeccable audit`,
  `critique`, `polish`, `adapt`, `harden`...); apoia `agent-shell` (Fase 1,
  fidelidade ao Figma) e `val-manual-qa` na revisão visual/responsiva. Ative
  com `/impeccable init` antes do primeiro uso no projeto.
- `frontend-design` e `ui-ux-pro-max` — já instaladas globalmente antes deste
  projeto; reforçam direção visual e boas práticas de UI/UX ao implementar
  qualquer tela.
