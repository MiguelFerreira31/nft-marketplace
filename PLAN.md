# Plano de Ação — NFT Marketplace (Desafio Frontend)

Baseado em `DESAFIO.md`. Organiza o trabalho em fases → tasks → subtasks, com um
agente executor e um (ou mais) subagente validador por task. Nenhuma task é
considerada "feita" sem passar pelo seu validador.

## Como usar este plano

- Cada task tem **Entregável**, **Critério de aceite** (extraído literalmente do
  enunciado) e **Gate de validação** (o que o subagente validador precisa
  confirmar antes de liberar a próxima task).
- `Agente` = quem implementa (via `Agent` tool, `subagent_type` sugerido entre
  parênteses). `Validador` = quem revisa/testa depois, de forma independente
  (não é o mesmo processo que implementou).
- Marque `[ ]` → `[x]` conforme as subtasks avançam. Não avance de fase com
  gates pendentes — eles compõem os critérios eliminatórios da seção 11 do
  readme.

---

## Agentes e subagentes (papéis fixos)

| Papel | Tipo de agente | Responsabilidade |
| --- | --- | --- |
| `agent-architect` | `Plan` | Estrutura de pastas, contratos REST/tipos, ADRs, política de cache/retry/idempotência |
| `agent-shell` | `general-purpose` | Design system, shadcn/ui, layout, roteamento (TanStack Router), responsividade base |
| `agent-mocks` | `general-purpose` | Handlers MSW, fixtures, cenários de rede/falha, binding Socket.IO |
| `agent-auth` | `general-purpose` | Sessão, login, cadastro, proteção de rotas |
| `agent-catalog` | `general-purpose` | Início, busca/filtros/paginação, detalhe do NFT, favoritos |
| `agent-cart` | `general-purpose` | Carrinho, cupom, totais, persistência |
| `agent-realtime` | `general-purpose` | Cliente Socket.IO, reconciliação REST↔eventos |
| `agent-checkout` | `general-purpose` | Pagamento, carteiras, confirmação, idempotência de pedido |
| `agent-account` | `general-purpose` | Perfil, avatar, senha, carteiras (CRUD) |
| `agent-tests` | `general-purpose` | Suites Playwright (E2E + visual) |
| `agent-quality` | `general-purpose` | Acessibilidade, Lighthouse, performance |
| `agent-devops` | `general-purpose` | Build, variáveis de ambiente, deploy, documentação final |

| Validador | Tipo / skill | O que audita |
| --- | --- | --- |
| `val-architecture` | skill `engineering:architecture` | Coerência de contratos, tipagem, ADRs, se bate com seção 4/5 do readme |
| `val-code-review` | skill `engineering:code-review` (effort alto) | Correção, segurança, performance, reuso — roda em todo diff antes de mergear |
| `val-a11y` | skill `design:accessibility-review` | WCAG 2.1 AA, foco, teclado, contraste, zoom |
| `val-testing-strategy` | skill `engineering:testing-strategy` + execução real do Playwright | Cobertura real dos 12 itens da seção 9 |
| `val-realtime-qa` | `general-purpose` (fork) rodando a app com DevTools/Socket.IO | Duplicidade de evento, ordenação, reconexão, isolamento por sessão |
| `val-perf` | `general-purpose` executando Lighthouse 3x por página/perfil | Metas da seção 10 e ausência de simplificações só para pontuação |
| `val-deploy` | skill `engineering:deploy-checklist` | Checkout limpo, build de demo, URL pública, refresh/acesso direto |
| `val-manual-qa` | `general-purpose` (fork) rodando a app no browser | Fidelidade visual ao Figma, estados não desenhados, mobile/tablet/desktop |

Regra fixa: **quem implementa uma task nunca é quem a valida**. Toda task abaixo
dispara seu `Validador` correspondente antes de ser marcada concluída.

---

## Fase 0 — Fundação e contratos

### Task 0.1 — Setup do projeto
Agente: `agent-architect` · Validador: `val-architecture`

- [ ] Inicializar projeto (Vite + React + TS), lockfile versionado.
- [ ] Instalar e configurar: TanStack Router, TanStack Query, Axios, Tailwind,
      shadcn/ui, MSW, Playwright, Lighthouse CI.
- [ ] Estrutura de pastas por domínio (catálogo, carrinho, checkout, conta,
      realtime, mocks) com separação clara transporte/estado/UI.
- [ ] Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test:e2e`,
      `lighthouse`.

**Gate:** `val-architecture` confirma que a estrutura separa transporte
(Axios) / estado (Query) / UI, e que os scripts do enunciado (seção 12) existem
e rodam a partir de checkout limpo.

### Task 0.2 — Contratos REST e tipos (seção 5)
Agente: `agent-architect` · Validador: `val-architecture`

- [ ] Documentar contratos: sessão/conta, NFTs, favoritos, carrinho, cotação,
      pedidos, perfil, carteiras — com schemas de erro (validação, sessão
      inválida, permissão, 404, conflito de disponibilidade, falha transitória).
- [ ] Definir chave de idempotência para criação de pedido (mesma tentativa →
      mesmo pedido; chave reutilizada com payload diferente → conflito).
- [ ] Gerar tipos TS compartilhados entre mocks, client Axios e UI.
- [ ] Documentar valores em ETH como string decimal (sem perda de precisão) e
      quantidades como inteiros.

**Gate:** `val-architecture` verifica que todo contrato tem tipo TS único
reaproveitado por MSW e pelo client — zero "any" ou shapes duplicados.

### Task 0.3 — Política de cache, retry e sincronização
Agente: `agent-architect` · Validador: `val-code-review`

- [ ] Documentar (arquivo próprio, referenciado em `ARCHITECTURE.md`): staleTime
      por recurso, estratégia de invalidação pós-mutation, retries, cancelamento
      de requisições obsoletas, isolamento de cache por usuário/parâmetros.
- [ ] Definir estratégia de atualização otimista (mínimo 1 interação) + rollback.

**Gate:** `val-code-review` confere que a política documentada é a que
efetivamente será implementada (sem decisões "a combinar").

---

## Fase 1 — Shell, roteamento e design system

### Task 1.1 — Rotas e layout (TanStack Router)
Agente: `agent-shell` · Validador: `val-code-review`

- [ ] Rotas para as 9 telas da seção 3, com parâmetros de busca tipados.
- [ ] Proteção de rotas privadas (checkout, perfil, carteiras, favoritos,
      pedidos) com retomada do fluxo após login.
- [ ] Tratamento de rota inexistente e acesso direto a qualquer tela.
- [ ] Layout base responsivo (390/768/1440) com shadcn/ui adaptado à
      identidade visual do Figma.

**Gate:** `val-manual-qa` acessa cada rota diretamente (URL colada) e via
refresh, incluindo uma rota privada deslogado — deve redirecionar e retomar.

### Task 1.2 — Design tokens e componentes base
Agente: `agent-shell` · Validador: `val-manual-qa`

- [ ] Tipografia, cores, espaçamentos extraídos do Figma como tokens.
- [ ] Skeletons com shimmer (sem layout shift) para catálogo, detalhe, resumo
      do carrinho.
- [ ] Respeito a `prefers-reduced-motion`.

**Gate:** `val-a11y` confirma que skeletons preservam dimensões (sem CLS) e
que animações respeitam movimento reduzido.

---

## Fase 2 — Mocking (MSW) e cenários

### Task 2.1 — Handlers REST e estado persistido
Agente: `agent-mocks` · Validador: `val-architecture`

- [ ] Handlers para os 8 recursos da seção 5, usando os tipos da Task 0.2.
- [ ] Estado consistente entre catálogo, favoritos, carrinho, perfil,
      carteiras, pedidos (persistência local para sustentar refresh).
- [ ] Reset de cenário restaura estado conhecido integralmente.
- [ ] Fixtures com ≥2 usuários e volume suficiente para exercitar filtros e
      paginação.

**Gate:** `val-code-review` garante que nenhuma resposta fictícia ou atalho de
negócio vive em componentes/hooks/Axios — tudo centralizado no MSW (critério
eliminatório da seção 11).

### Task 2.2 — Cenários de rede e falha configuráveis
Agente: `agent-mocks` · Validador: `val-testing-strategy`

- [ ] Latência variável, timeouts, indisponibilidade de conexão, HTTP 4xx/5xx.
- [ ] Cenários determinísticos da seção 6: sucesso/vazio, respostas fora de
      ordem, sessão expirada/não autorizado, conflito de cadastro/validação,
      cupom inválido/expirado, preço alterado/edição esgotada, timeout
      pós-criação de pedido com recuperação por idempotência, pagamento
      confirmado/recusado.
- [ ] Mecanismo de seleção/configuração de cenário documentável no README final.

**Gate:** `val-testing-strategy` roda cada cenário manualmente uma vez e
confirma que é reproduzível e determinístico (mesma entrada → mesmo resultado).

### Task 2.3 — Binding Socket.IO no MSW
Agente: `agent-mocks` · Validador: `val-realtime-qa`

- [ ] Integrar `@mswjs/socket.io-binding` (ou equivalente) para emitir
      `nft.updated` e `order.updated` via `socket.io-client` real.
- [ ] Documentar transporte e limitações do ambiente de mock.
- [ ] Garantir que alterar dados simulados reflete tanto em REST quanto nos
      eventos correspondentes.

**Gate:** `val-realtime-qa` confirma, inspecionando o client, que os eventos
chegam pelo `socket.io-client` (não por setters/callbacks diretos na UI —
critério eliminatório).

---

## Fase 3 — Conta e sessão

### Task 3.1 — Cadastro, login, logout
Agente: `agent-auth` · Validador: `val-testing-strategy`

- [ ] Formulários com validação e tratamento de conflito (cadastro duplicado).
- [ ] Sessão recuperável após refresh; expiração tratada durante navegação e
      checkout, preservando contexto para retomada.
- [ ] Logout/troca de usuário limpam cache privado e subscriptions da sessão
      anterior.
- [ ] Senhas fictícias, nunca armazenadas em claro.

**Gate:** `val-code-review` + `val-testing-strategy` — teste manual de troca
de usuário A→B confirma que nenhum dado de A aparece para B (critério
eliminatório "exposição de dados entre usuários").

---

## Fase 4 — Catálogo e detalhe do NFT

### Task 4.1 — Início: destaques, busca, filtros, ordenação, paginação
Agente: `agent-catalog` · Validador: `val-testing-strategy`

- [ ] Estado de busca/filtros/ordenação/paginação na URL, sobrevivendo a
      refresh e navegação pelo histórico (back/forward).
- [ ] Filtros combináveis; qualquer mudança reinicia paginação.
- [ ] Estados de carregamento, vazio, erro, respostas fora de ordem tratadas
      (descartar resposta obsoleta).

**Gate:** `val-manual-qa` aplica 2+ filtros, navega para página 2, usa o botão
voltar do browser e confirma que o estado é restaurado fielmente.

### Task 4.2 — Detalhe do NFT
Agente: `agent-catalog` · Validador: `val-manual-qa`

- [ ] Galeria, informações, edição, quantidade, favoritos, compra.
- [ ] Acesso direto, NFT inexistente, edição indisponível, limite de
      quantidade.
- [ ] Favoritos persistem por usuário autenticado (consulta/inclusão/remoção).

**Gate:** `val-testing-strategy` cobre favorito com falha de mutation
(rollback otimista) + recuperação de estado.

---

## Fase 5 — Carrinho

### Task 5.1 — Itens, cupom e totais
Agente: `agent-cart` · Validador: `val-code-review`

- [x] Adicionar/alterar/remover respeitando disponibilidade por NFT/edição.
- [x] Persistência após refresh; itens de visitante preservados ao autenticar.
- [x] Cupom aplicado/removido com tratamento de inválido/expirado.
- [x] Subtotal, desconto, taxa de rede, total coerentes com a API; ETH como
      string decimal sem perda de precisão; quantidades inteiras.
- [x] Reflete mudanças de preço/disponibilidade recebidas com o carrinho aberto.

**Gate:** `val-code-review` audita cálculos de totais linha a linha contra os
valores retornados pela API (nunca recalculados localmente de forma
divergente).

---

## Fase 6 — Tempo real (Socket.IO)

### Task 6.1 — Cliente e reconciliação
Agente: `agent-realtime` · Validador: `val-realtime-qa`

- [x] Consumir `nft.updated` e `order.updated` via `socket.io-client`,
      atualizando catálogo/detalhe/carrinho/pedido.
- [x] Eventos com identidade estável, recurso e versão; tolerância a
      duplicatas e eventos antigos (sem regressão de estado nem reaplicação de
      efeito).
- [x] Reconciliação com REST após reconexão.
- [x] Eventos de sessão anterior nunca atualizam dados de outro usuário.
- [x] Listeners/subscriptions liberados ao fim do ciclo de vida do componente.

**Gate:** `val-realtime-qa` injeta evento duplicado e evento "antigo"
(versão menor) manualmente e confirma que o estado final não regride.

### Task 6.2 — Cenário obrigatório de preço/disponibilidade no carrinho
Agente: `agent-realtime` + `agent-cart` · Validador: `val-manual-qa`

- [x] NFT no carrinho sofre mudança de preço/disponibilidade durante a
      navegação → UI informa e atualiza o resumo.
- [x] Checkout impede confirmação com cotação desatualizada, exigindo nova
      confirmação do usuário.

**Gate:** `val-manual-qa` reproduz o roteiro dos 4 passos da seção 7
literalmente e confirma bloqueio de confirmação com cotação velha.

---

## Fase 7 — Pagamento e confirmação

### Task 7.1 — Fluxo de pagamento
Agente: `agent-checkout` · Validador: `val-code-review`

> **Nota herdada do gate da Fase 3 resolvida nesta task:** `requireAuth`
> aguarda `fetchQuery(sessionQueryOptions())`; a sessão stale é revalidada
> antes de liberar a rota. O E2E cobre a expiração durante navegação SPA.
> Ver `ARCHITECTURE.md` §13.1.
>
> **Integração com a Fase 6:** o checkout já exige revisão explícita da
> cotação corrente e invalida essa revisão quando preço/disponibilidade ou
> `quoteVersion` mudam. O envio final do pedido deve usar a mesma versão
> revisada, revalidar com a API antes do POST e voltar a exigir revisão se
> houver conflito — nunca confirmar com uma cotação diferente da aceita.

- [x] Dados do colecionador, seleção de carteira/rede, simulação de conexão,
      recusa e desconexão.
- [x] Revalidação de preço, disponibilidade, cupom e taxas antes de confirmar;
      mudança exige nova confirmação.
- [x] Prevenção de pedido duplicado (clique repetido / reenvio após timeout)
      via chave de idempotência.
- [x] Estados pendente/confirmado/recusado recuperáveis após refresh/reconexão;
      confirmado/recusado são terminais.

**Gate:** `val-code-review` confirma uso real da chave de idempotência (mesma
tentativa recupera o mesmo pedido; chave reaproveitada com payload diferente
gera conflito) — critério eliminatório "compra confirmada sem resposta da
simulação" depende disso.

### Task 7.2 — Confirmação e recibo
Agente: `agent-checkout` · Validador: `val-manual-qa`

- [x] Confirmação exibida só para pedido efetivamente confirmado na simulação.
- [x] Falhas preservam itens; confirmação remove do carrinho apenas o que foi
      comprado.
- [x] Recibo reproduz snapshot do pedido, imune a mudanças futuras do catálogo.

**Gate:** `val-manual-qa` altera preço do NFT após confirmar pedido e verifica
que o recibo não muda.

> **Nota não bloqueante do gate manual:** os painéis TanStack de devtools
> podem sobrepor os totais/ações do checkout em 390/768 px durante `vite dev`.
> Ambos são condicionados a `import.meta.env.DEV` e não aparecem no build de
> produção; reposicionar se o roteiro manual continuar sendo executado no
> ambiente de desenvolvimento.

---

## Fase 8 — Perfil e carteiras

### Task 8.1 — Perfil
Agente: `agent-account` · Validador: `val-testing-strategy`

- [x] Edição de dados, avatar, alteração de senha, erros da API tratados.
- [x] Alterações confirmadas persistem após refresh.

### Task 8.2 — Carteiras
Agente: `agent-account` · Validador: `val-testing-strategy`

- [x] Cadastro/edição de carteira principal e secundária, com validação.
- [x] Funciona em mobile mesmo sem frame específico no Figma, seguindo o
      mesmo padrão visual das demais telas.

**Gate:** `val-a11y` + `val-manual-qa` cobrem formulários (labels, erros
associados, foco) e o layout mobile sem frame dedicado.

---

## Fase 9 — Acessibilidade e responsividade (transversal)

Agente: `agent-quality` · Validador: `val-a11y`

> **Nota herdada do gate da Fase 8**: um ajuste de contraste do anel de foco
> (remover a opacidade `/50`/`/30`/`/15%` dos tokens `--input`/`--ring` e de
> `outline-ring`/`focus-visible:ring-ring` em `button.tsx`, `input.tsx`,
> `index.css` e nos componentes do catálogo/checkout) foi tentado fora de
> escopo por um processo não supervisionado durante a Fase 8 e **revertido**
> por não ter passado por gate de validação daquelas fases já fechadas. A
> ideia em si é válida (melhora contraste do foco) — avaliar e implementar
> aqui, com o gate normal desta fase, se fizer sentido.
>
> **Resolvido nesta fase** (`agent-quality`, ver `ARCHITECTURE.md` §15.2):
> simplesmente remover a opacidade não bastava — `--ring` em modo claro
> (`oklch(0.708 0 0)`) ficava em 2,59:1 mesmo opaco, abaixo do 3:1 exigido
> por WCAG 1.4.11. Corrigido escurecendo `--ring` claro para
> `oklch(0.556 0 0)` (reaproveita o tom já usado por `--muted-foreground`)
> **e** removendo a opacidade de todo `ring-ring/50`/`outline-ring/50` do
> projeto — resultado 4,73:1 (claro) / 4,18:1 (escuro). O anel de erro
> (`ring-destructive/20`/`/40`) foi mantido como está, fora do escopo
> ("anel de foco", não anel de erro) e já coberto por borda opaca + mensagem
> de erro associada — números registrados em `ARCHITECTURE.md` §15.2 para
> uma fase futura decidir se vale endurecer também.

- [x] Navegação por teclado e foco visível em todas as telas. Achado e
      corrigido: checkbox `sr-only` dos filtros de categoria do catálogo
      (`catalog-toolbar.tsx`) não tinha nenhum indicador de foco visível —
      `has-[:focus-visible]:ring-*` no `<label>` resolve. Demais telas
      (incluindo Pagamento/Confirmação, sem auditoria dedicada até agora)
      sem achados — ver `ARCHITECTURE.md` §15.1–15.3.
- [x] Controle de foco em diálogos/drawers (trap + retorno ao gatilho). Não
      aplicável: nenhum diálogo/drawer/sheet/popover existe no projeto
      (inventário em `ARCHITECTURE.md` §15.4). O menu mobile do `SiteHeader`
      é um disclosure inline (não modal), não exige trap.
- [x] Semântica, labels, mensagens de erro associadas aos campos. Auditado
      especificamente catálogo (filtros), carrinho (cupom/quantidade) e
      checkout (carteira/rede) — sem achados, ver `ARCHITECTURE.md` §15.5.
- [x] Alternativas textuais para imagens relevantes — ver `ARCHITECTURE.md`
      §15.6.
- [x] Contraste legível; nenhum estado dependente só de cor — ver
      `ARCHITECTURE.md` §15.2/§15.7.
- [x] Feedback acessível (aria-live ou equivalente) para mutations e eventos
      em tempo real. Auditado especificamente carrinho, checkout e os
      banners de preço/disponibilidade da Fase 6 — sem achados, ver
      `ARCHITECTURE.md` §15.8.
- [x] Sem overflow horizontal indevido; sem perda de conteúdo em zoom —
      testado em 320/390/768/1440px e com zoom CSS 1.5×/2×/3× nas 9 rotas
      (incluindo fluxo de compra completo até confirmação) — sem achados,
      ver `ARCHITECTURE.md` §15.9.
- [x] Documentar qualquer substituição de asset/ajuste de acessibilidade vs.
      Figma — ver `ARCHITECTURE.md` §15.10.

**Gate:** `val-a11y` roda auditoria WCAG 2.1 AA em todas as 9 telas (desktop +
mobile) antes de liberar a Fase 10.

---

## Fase 10 — Testes com Playwright (seção 9)

Agente: `agent-tests` · Validador: `val-testing-strategy`

Cada item abaixo é uma subtask/arquivo de spec próprio; todos correndo contra
os mocks MSW, com estado isolado por teste e controle de relógio/latência nos
casos sensíveis a tempo:

- [ ] 1. Busca, filtros combinados, ordenação, paginação, restauração via
      histórico.
- [ ] 2. Acesso direto ao detalhe + recurso inexistente.
- [ ] 3. Cadastro, login, expiração de sessão, logout, troca de usuário.
- [ ] 4. Favoritos: sucesso, falha de mutation, recuperação.
- [ ] 5. Carrinho: quantidades, remoção, cupom, persistência refresh/login.
- [ ] 6. Compra completa catálogo → recibo confirmado.
- [ ] 7. Falha de pagamento, clique repetido, timeout com recuperação do
      mesmo pedido.
- [ ] 8. Edição de perfil/avatar/senha/carteiras com erros de validação.
- [ ] 9. Alteração de preço/disponibilidade via Socket.IO durante checkout.
- [ ] 10. Eventos duplicados/antigos, desconexão, retomada de pedido pendente.
- [ ] 11. Navegação por teclado, foco de diálogos, validação de formulários.
- [ ] 12. Skeletons em carregamento lento, feedback de falha, recuperação.
- [ ] Execução em Chromium, viewports desktop e mobile.
- [ ] Regressão visual (início, detalhe, carrinho, pagamento) com baselines
      versionadas e dados estáveis.
- [ ] Relatório HTML + traces das falhas gerados e versionados.

**Gate:** `val-testing-strategy` executa `test:e2e` do zero (checkout limpo)
e confirma 100% dos 12 cenários passando + specs de tempo real realmente
dependentes do `socket.io-client`/handlers MSW (não de atalhos — critério
eliminatório "ausência de testes E2E executáveis").

---

## Fase 11 — Performance e Lighthouse (seção 10)

Agente: `agent-quality` · Validador: `val-perf`

- [ ] Build otimizado + cenário padrão dos mocks para a auditoria.
- [ ] 3 medições por página (Início, Detalhe) × perfil (mobile, desktop);
      reportar mediana por categoria.
- [ ] Metas: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90.
- [ ] Registrar LCP, CLS, TBT; justificar qualquer resultado abaixo da meta.
- [ ] Versionar configuração da auditoria + relatórios HTML/JSON + versões de
      ferramentas/ambiente/condições de execução.
- [ ] Garantir que a auditoria carrega imagens/fontes/funcionalidades reais
      (sem simplificação só para pontuação — critério eliminatório indireto).

**Gate:** `val-perf` roda `lighthouse` 3x por página/perfil de forma
independente e confere que os números batem com o relatório entregue.

---

## Fase 12 — Documentação e deploy (seção 12)

Agente: `agent-devops` · Validador: `val-deploy`

- [ ] `README.md`: setup, variáveis de ambiente, credenciais fictícias,
      seleção/reset de cenários MSW, comandos (`dev`, `build`, `preview`,
      `typecheck`, `lint`, `test:e2e`, `lighthouse`), como reproduzir fluxos de
      falha.
- [ ] `ARCHITECTURE.md`: contratos REST/eventos, política de sessão, estado
      do carrinho, estratégia de cache, reconciliação REST↔Socket.IO,
      limitações, decisões de UX, desvios do Figma. Inclua como débito
      técnico conhecido (achado BAIXO do gate da Fase 3, `val-code-review`):
      `adoptSession` exclui a key `session` do cancelamento de queries em
      voo; seguro hoje só porque o MSW lê estado "ao vivo" no momento da
      resposta, mas precisa de `cancelQueries` defensivo antes de qualquer
      troca por backend real (fora do escopo deste desafio).
- [ ] Deploy público (Vercel/Netlify/Cloudflare Pages) com mocks e tempo real
      funcionando em produção estática.
- [ ] Acesso direto e refresh de qualquer rota funcionando no ambiente
      publicado.
- [ ] Validar que a versão publicada corresponde exatamente ao código
      entregue.

**Gate:** `val-deploy` faz checkout limpo em máquina/diretório novo, roda os
comandos documentados do zero, e separadamente abre a URL pública testando
refresh em pelo menos 3 rotas (uma privada, uma com parâmetro de busca, uma
inexistente).

---

## Checklist eliminatório final (seção 11 — bloqueia entrega se falhar)

Validador único e obrigatório antes de considerar o desafio "pronto":
`val-code-review` (effort `xhigh`) + `val-realtime-qa` + `val-deploy` em
conjunto, cada um assinando seu trecho:

- [ ] Stack obrigatória (React/TS/TanStack Router/TanStack Query/Axios/
      Socket.IO/Tailwind/shadcn/MSW/Playwright/Lighthouse) usada de forma
      efetiva, não decorativa. — `val-code-review`
- [ ] Nenhum fluxo principal é "apenas visual" (toda ação crítica depende de
      resposta real da simulação). — `val-testing-strategy`
- [ ] Nenhuma compra é confirmada sem resposta da simulação de pedido. —
      `val-code-review`
- [ ] Nenhuma exposição de dados entre usuários (cache/subscriptions limpos
      no logout/troca). — `val-code-review`
- [ ] Nenhum evento de tempo real é simulado diretamente na UI — tudo passa
      pelo `socket.io-client` real. — `val-realtime-qa`
- [ ] Testes E2E executáveis existem e passam a partir de checkout limpo. —
      `val-testing-strategy`
- [ ] Deploy público reflete o código entregue, com mocks/tempo real
      funcionando. — `val-deploy`

Só depois desse checklist assinado a entrega é considerada 100% funcional
conforme o enunciado.
