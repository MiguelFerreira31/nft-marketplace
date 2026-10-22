# Arquitetura — NFT Marketplace

Este documento é o entregável de arquitetura das Tasks 0.1–0.3 do `PLAN.md`
(Fase 0 — Fundação e contratos). Ele descreve o que foi montado: stack,
estrutura de pastas, contratos REST/tipos compartilhados, a chave de
idempotência de pedido, a regra de precisão de valores em ETH, e a política
de cache/retry/invalidação/cancelamento/isolamento do TanStack Query —
incluindo a interação escolhida para atualização otimista com rollback.

As fases seguintes (1–12, `PLAN.md`) implementam telas, mocks, tempo real,
testes e deploy sobre esta fundação. Nada neste documento implementa fluxo
de negócio — isso é escopo dos agentes `agent-shell`, `agent-mocks`,
`agent-catalog`, `agent-cart`, `agent-realtime`, `agent-checkout`,
`agent-account`, `agent-auth`.

## 1. Stack e decisões de setup

| Responsabilidade | Ferramenta | Observação |
| --- | --- | --- |
| Build | Vite 8 | `npm create vite@latest -- --template react-ts` |
| UI | React 19.3 | — |
| Linguagem | TypeScript ~6.0 | `verbatimModuleSyntax`, `noUnusedLocals/Parameters` ativos |
| Roteamento | TanStack Router 1.x | file-based routing via `@tanstack/router-plugin` (gera `src/routeTree.gen.ts`) |
| Estado remoto | TanStack Query 5.x | `src/shared/query` |
| HTTP | Axios 1.x | único client em `src/shared/api/http.ts` |
| Tempo real | socket.io-client 4.x | fábrica tipada em `src/features/realtime/client/socket.ts` (conexão/reconciliação reais ficam para a Fase 6) |
| Estilo | Tailwind CSS 4 | via `@tailwindcss/vite`, sem `tailwind.config.js` (config em `src/index.css`) |
| Componentes | shadcn/ui (`-b radix`, preset `nova`) | `components.json`; tokens visuais de placeholder — Figma entra na Task 1.2 |
| Mocking | MSW 3.x | `src/features/mocks` (handlers vazios até a Fase 2) |
| E2E/visual | Playwright | `playwright.config.ts` + `tests/e2e` |
| Performance | Lighthouse CI (`@lhci/cli`) | `lighthouserc.cjs` |
| Lint | `oxlint` | mantido do scaffold do Vite (mais rápido que ESLint; mesmo propósito) |

Linha única (`npm run dev`) sobe o app com rotas, Tailwind/shadcn e
providers de Query/Router já ativos — ver placeholder em `src/routes/index.tsx`.

### Decisões/desvios registrados

- **`src/routeTree.gen.ts` é versionado no git**, embora seja gerado pelo
  plugin do TanStack Router. Motivo: o script `build`/`typecheck` roda
  `tsc -b` **antes** de qualquer passo do Vite, então o arquivo precisa
  existir no disco antes do primeiro `tsc` de um checkout limpo. O plugin
  continua regenerando/atualizando esse arquivo a cada `dev`/`build` quando
  rotas mudam — não editar manualmente (cabeçalho do próprio arquivo já
  avisa isso).
- **`oxlint` no lugar de ESLint**: veio do scaffold oficial do Vite para
  este template e cobre o mesmo propósito pedido pelo enunciado (um
  `lint` executável); `.oxlintrc.json` tem overrides para o padrão
  inerente de arquivos de rota (`src/routes/**`, co-exportam `Route` +
  componente) e para os componentes gerados pelo shadcn (`src/components/ui/**`,
  co-exportam o componente + `cva` variants) — ambos avisos de
  "fast refresh", não problemas reais.
- **Tailwind v4 sem `tailwind.config.js`**: a v4 move a configuração para
  CSS (`@theme` em `src/index.css`, gerado pelo `shadcn init`). É o setup
  atual recomendado pela própria Tailwind/shadcn para Vite.
- **`lighthouserc.cjs` em nível `warn`, não `error`**, nesta fase: só existe
  a rota placeholder, então um score de SEO/Performance baixo é esperado e
  não deve travar o pipeline antes de existir conteúdo real. `agent-quality`
  (Fase 11) deve apontar `collect.url` para as rotas reais de Início/Detalhe
  e subir os `assert` para `error` nos limiares da seção 10 do readme.
- **Vulnerabilidades do `npm audit`**: existem apenas em devDependencies
  (`@lhci/cli` e a CLI `shadcn`, ambas com cadeias de dependência antigas
  tipo `glob@7`/`rimraf@3`). `npm audit --omit=dev` reporta **0
  vulnerabilidades** — nada disso entra no bundle de produção.

## 2. Estrutura de pastas — transporte / estado / UI

```
src/
  routes/                     # TanStack Router (file-based). Hoje só __root.tsx + index.tsx (placeholder).
  shared/
    types/                    # ÚNICA fonte de verdade dos contratos (seção 3 abaixo).
    api/
      http.ts                 # Único client Axios (transporte).
      idempotency.ts           # Geração da Idempotency-Key.
    query/
      queryClient.ts          # Política de cache/retry (seção 4 abaixo).
      keys.ts                 # Fábrica de query keys (isolamento por usuário/parâmetros).
  features/
    catalog/   {api, hooks, components}   # NFTs + favoritos
    cart/      {api, hooks, components}   # carrinho + cotação
    checkout/  {api, hooks, components}   # pedidos + idempotência
    account/   {api, hooks, components}   # sessão, perfil, carteiras
    realtime/  {client, hooks}            # socket.io-client tipado (Fase 6 preenche hooks/)
    mocks/     {handlers, fixtures, browser.ts, server.ts}  # MSW (Fase 2 preenche handlers/fixtures)
```

Cada domínio em `features/*` segue a mesma separação:

- **`api/*.api.ts`** — transporte puro: funções que só chamam `http`
  (Axios) e retornam tipos de `shared/types`. Nenhuma lógica de cache, nenhum
  hook React aqui.
- **`hooks/*.ts`** — estado: `useQuery`/`useMutation` do TanStack Query,
  usando `queryKeys` (isolamento) e chamando as funções de `api/`. Nenhuma
  chamada `axios`/`fetch` direta aqui.
- **`components/`** — UI (preenchida pelas Fases 1–8); hoje só contém
  `.gitkeep` porque construir tela é fora do escopo da Fase 0.

Essa divisão é testável mecanicamente: nenhum arquivo em `hooks/` importa
`axios`, e nenhum arquivo em `api/` importa de `@tanstack/react-query`.

## 3. Contratos REST (seção 5 do readme) e tipos compartilhados

Todo tipo mora em `src/shared/types/*.ts` (barrel `src/shared/types/index.ts`)
e é importado tanto pela camada `api/` (Axios) quanto, nas fases seguintes,
pelos handlers MSW e pelos componentes — zero `any`, zero shape duplicado.

| Recurso (readme §5) | Arquivo de tipos | Transporte (Axios) | Estado (Query) |
| --- | --- | --- | --- |
| Sessão e conta | `session.ts` | `features/account/api/session.api.ts` | `features/account/hooks/useSessionQuery.ts` |
| NFTs | `nft.ts` | `features/catalog/api/nfts.api.ts` | `features/catalog/hooks/useNftsQuery.ts`, `useNftDetailQuery.ts` |
| Favoritos | `favorites.ts` | `features/catalog/api/favorites.api.ts` | `features/catalog/hooks/useFavoritesQuery.ts`, `useToggleFavoriteMutation.ts` |
| Carrinho | `cart.ts` | `features/cart/api/cart.api.ts` | `features/cart/hooks/useCartQuery.ts`, `useCartMutations.ts` |
| Cotação | `quote.ts` | `features/cart/api/quote.api.ts` | `features/cart/hooks/useQuoteQuery.ts` |
| Pedidos | `orders.ts` | `features/checkout/api/orders.api.ts` | `features/checkout/hooks/useOrderQuery.ts`, `useCreateOrderMutation.ts` |
| Perfil | `profile.ts` | `features/account/api/profile.api.ts` | `features/account/hooks/useProfileQuery.ts` |
| Carteiras | `wallets.ts` | `features/account/api/wallets.api.ts` | `features/account/hooks/useWalletsQuery.ts` |

Eventos de tempo real (readme §7) estão em `shared/types/events.ts`
(`NftUpdatedEvent`, `OrderUpdatedEvent`), com o mesmo envelope
`{ id, resource, resourceId, version, occurredAt, payload }` usado para
descartar duplicatas/eventos antigos (Fase 6).

### 3.1 Formato de erro (seção 5)

Toda resposta de erro HTTP usa o envelope único `ApiErrorResponse` (`shared/types/errors.ts`):

```ts
interface ApiErrorResponse { error: ApiErrorBody }

type ApiErrorBody =
  | ValidationErrorBody    // 400 — fieldErrors: Record<string, string[]>
  | InvalidSessionErrorBody // 401 — reason: MISSING_SESSION | EXPIRED_SESSION | REVOKED_SESSION
  | PermissionErrorBody     // 403
  | NotFoundErrorBody       // 404 — resource: 'nft' | 'edition' | 'cart_item' | 'order' | 'wallet' | 'profile' | 'coupon'
  | ConflictErrorBody       // 409 — reason: DUPLICATE_EMAIL | STOCK_UNAVAILABLE | COUPON_UNAVAILABLE | IDEMPOTENCY_KEY_MISMATCH
  | TransientErrorBody      // 5xx/falha de rede simulada — retryable: true
```

`src/shared/api/http.ts` expõe `isApiError`/`getApiErrorBody` para qualquer
`onError` de mutation decidir o comportamento (mensagem de campo, redirect de
sessão, etc.) sem parsing manual. Os handlers MSW (Fase 2) devem produzir
exatamente este shape — não outro.

### 3.2 Regra de precisão — ETH e quantidades

- **Todo valor em ETH é `string` decimal** (`EthAmount = string`,
  `shared/types/common.ts`), nunca `number`. Motivo: ponto flutuante binário
  (IEEE-754) perde precisão em somas simples (`0.1 + 0.2 !== 0.3`), e o
  enunciado exige precisão mantida em cálculos e exibição (readme §3). A API
  é a fonte de verdade para subtotal/desconto/taxa/total — o cliente nunca
  recalcula esses valores localmente de forma divergente; só formata. Se
  algum componente precisar comparar/somar `EthAmount` no cliente (ex.:
  conferência visual), deve usar uma lib de decimal arbitrário
  (ex.: `decimal.js`), nunca `Number(a) + Number(b)`.
- **Quantidades são sempre inteiras** (`Quantity = number`, mesmo arquivo) —
  nunca string, nunca fracionário.

### 3.3 Chave de idempotência de pedido (seção 5)

Contrato completo documentado em `shared/types/orders.ts`. Resumo:

- `POST /orders` aceita o header `Idempotency-Key` (tipo `IdempotencyKey`,
  gerado por `shared/api/idempotency.ts#createIdempotencyKey()`, um
  `crypto.randomUUID()`).
- **Mesma chave + mesmo payload** (`cartId`, `quoteVersion`, `walletId`,
  `network`) → não cria outro pedido; responde com o pedido já existente
  (mesmo `OrderId`). Cobre clique repetido e retry automático após timeout.
- **Mesma chave + payload diferente** → `409 CONFLICT` com
  `reason: 'IDEMPOTENCY_KEY_MISMATCH'`.
- Uma chave é gerada **uma vez por tentativa de compra**; o chamador
  (`agent-checkout`, Fase 7) guarda o valor em estado local/variável da
  mutation e a reutiliza em qualquer reenvio daquela mesma tentativa. Uma
  nova tentativa (ex.: usuário mudou o carrinho e tentou de novo) gera uma
  chave nova. `useCreateOrderMutation` (Fase 0, já implementado como
  plumbing) usa `retry: false` deliberadamente — o reenvio é controlado pelo
  chamador com a mesma chave, não pelo retry genérico do Query (que geraria
  uma tentativa "invisível" fora do controle da idempotência).

## 4. Política de TanStack Query

Configuração base em `src/shared/query/queryClient.ts`; chaves em
`src/shared/query/keys.ts`.

### 4.1 `staleTime` por recurso

| Recurso | `staleTime` | Por quê |
| --- | --- | --- |
| Default (NFTs lista/detalhe, perfil, carteiras) | 30s | Catálogo também recebe `nft.updated` via socket — não precisa refetch agressivo via HTTP. |
| Sessão (`useSessionQuery`) | 10s | Precisa refletir expiração rápido (readme §3: tratar expiração durante navegação/checkout). |
| Carrinho (`useCartQuery`) | 10s | Muda com frequência (itens, cupom) e participa do fluxo de checkout. |
| Cotação (`useQuoteQuery`) | 0 (sempre revalidada) | Readme §3: "Revalidar preço, disponibilidade, cupom e taxas antes de confirmar a compra" — o checkout nunca decide sobre uma cotação em cache sem refetch. |
| Pedido pendente (`useOrderQuery`) | `refetchInterval: 3s` enquanto `status === 'pending'`, `false` quando terminal | Recupera estado após desconexão/refresh (readme §7) sem polling eterno uma vez confirmado/recusado. |

### 4.2 Retries

- Default global: `retry` customizado em `queryClient.ts` — **só** retry
  (até 2x, backoff 1s/2s/4s) quando o erro é `TRANSIENT_ERROR`. Erros de
  validação/sessão/permissão/404/conflito nunca são retried (retry não
  resolveria o problema e mascararia o erro real na UI).
  `refetchOnWindowFocus: false` — evita refetch “global” surpresa nessa fase;
  pode ser revisto por tela se a Fase 4/5 precisar (ex.: carrinho).
- Mutations: `retry: false` por padrão. `POST /orders` reforça isso
  explicitamente (seção 3.3 acima) porque a semântica de reenvio é a
  idempotência controlada, não o retry genérico.

### 4.3 Invalidação pós-mutation

- Mutations de carrinho (`useAddCartItemMutation`, `useUpdateCartItemMutation`,
  `useRemoveCartItemMutation`) invalidam `queryKeys.cart.detail(userId)` —
  nunca recalculam subtotal/total local, sempre buscam de novo o carrinho
  autoritativo da API.
- `useApplyCouponMutation`/`useRemoveCouponMutation` escrevem a `Quote`
  retornada diretamente no cache (`setQueryData`) — a própria resposta da
  mutation já é o novo estado completo da cotação.
- `useCreateOrderMutation` escreve o `Order` retornado em
  `queryKeys.orders.detail(order.id)` — a tela de confirmação lê deste
  cache sem round-trip extra.
- `useLogoutMutation` chama `queryClient.clear()` — ver isolamento (4.5).

### 4.4 Cancelamento de respostas obsoletas

- Toda `queryFn` recebe e propaga o `AbortSignal` do Query para o Axios
  (`http.get(url, { signal })`), em todas as funções de `api/*.ts` — o Query
  cancela automaticamente uma requisição em voo quando a query é
  desmontada/a key muda antes da resposta chegar.
- `useNftsQuery` usa `placeholderData: keepPreviousData` para que trocar
  filtro/página não “pisque” para o skeleton enquanto a nova resposta
  chega, mas a query da combinação **anterior** de parâmetros ainda é
  cancelada/descartada pelo Query da forma usual (key diferente ⇒
  fetch diferente) — isto cobre “respostas fora de ordem” do catálogo
  (readme §3): se o usuário troca de filtro duas vezes rápido, só a
  resposta da combinação de parâmetros atual é aplicada.
- `useToggleFavoriteMutation.onMutate` cancela explicitamente
  (`queryClient.cancelQueries`) as queries de favoritos/detalhe/listagem
  antes de escrever o patch otimista, para que uma resposta tardia do
  fetch anterior não sobrescreva o optimistic update.

### 4.5 Isolamento por usuário e por parâmetros

- Toda query key de recurso privado inclui o `UserId` (ou o literal
  `'guest'` para carrinho de visitante) — `queryKeys.favorites.all(userId)`,
  `queryKeys.cart.detail(userId)`, `queryKeys.profile.detail(userId)`,
  `queryKeys.wallets.all(userId)`. Dois usuários nunca leem a entrada de
  cache um do outro porque a key é literalmente diferente.
- Toda query key de listagem inclui os parâmetros completos —
  `queryKeys.nfts.list(params)` — filtros/página diferentes nunca
  compartilham cache nem se misturam.
- **Logout/troca de usuário** (`useLogoutMutation`) chama
  `queryClient.clear()`: remove **todo** o cache, não só a sessão — cobre o
  critério eliminatório da seção 11 ("exposição de dados entre usuários").
  `agent-auth` (Fase 3) deve garantir que login de um novo usuário parte de
  cache zerado (chamando logout/clear antes de um novo login "trocar" de
  usuário sem logout explícito) e que `agent-realtime` (Fase 6) desconecta o
  socket da sessão anterior no mesmo momento (nenhum evento de uma sessão
  deve atualizar cache de outra).

### 4.6 Atualização otimista com rollback (obrigatória, readme §4)

**Interação escolhida: favoritar/desfavoritar um NFT**
(`src/features/catalog/hooks/useToggleFavoriteMutation.ts`).

Justificativa da escolha: é uma interação de baixo risco (não envolve
dinheiro nem estoque, ao contrário de carrinho/checkout) e aparece
simultaneamente em pelo menos três lugares do cache (card de listagem,
detalhe do NFT, lista de favoritos) — bom exemplo de por que o rollback
precisa restaurar **todos** os caches tocados, não só um.

Fluxo implementado:

1. `onMutate`: cancela queries em voo de favoritos/detalhe/listagens
   (4.4), tira snapshot de cada cache afetado, e aplica o patch otimista:
   adiciona/remove o item de `favorites.all(userId)` e atualiza
   `isFavorited`/`favoriteCount` em `nfts.detail(nftId)` e em toda entrada
   de `nfts.list(*)` que contenha aquele NFT.
2. `onError`: restaura os três snapshots exatamente como estavam
   (`context.previousFavorites`, `previousDetail`, `previousLists`).
3. `onSettled`: invalida `favorites.all(userId)` e `nfts.detail(nftId)`
   para reconciliar com a verdade do servidor (ex.: `favoriteCount` exato,
   que pode diferir de "+1/-1" se outro usuário favoritou ao mesmo tempo).

Mutations de carrinho/pedido **não** são otimistas de propósito — seção 3
do readme exige que subtotal/desconto/taxa/total sempre reflitam a resposta
da API; uma escrita otimista de total criaria risco de mostrar um valor que
a API não confirmou. A única "otimização de percepção" ali é invalidação
imediata + skeleton (Task 1.2), não otimismo de dado monetário.

## 5. O que fica para as próximas fases (não implementado aqui, de propósito)

- Handlers MSW, fixtures, cenários de rede/falha, binding Socket.IO — Fase 2
  (`agent-mocks`). `src/features/mocks/handlers/index.ts` exporta `[]` só
  como ponto de extensão.
- Conexão/reconciliação real do socket (listeners, tolerância a
  duplicata/evento antigo, desconexão por sessão) — Fase 6 (`agent-realtime`).
  `src/features/realtime/client/socket.ts` só fabrica o client tipado,
  desconectado por padrão.
- Qualquer tela/fluxo de produto (catálogo, carrinho, checkout, perfil,
  carteiras, login/cadastro) e o shell/design tokens do Figma — Fases 1, 3–8
  (`agent-shell`, `agent-auth`, `agent-catalog`, `agent-cart`,
  `agent-checkout`, `agent-account`).
- Suites Playwright reais dos 12 cenários da seção 9 — Fase 10
  (`agent-tests`). `tests/e2e/smoke.spec.ts` só comprova que o pipeline de
  teste roda de ponta a ponta.
- Lighthouse com thresholds em `error` e páginas reais — Fase 11
  (`agent-quality`).

## 6. Scripts (readme §12)

| Script | Comando | Status verificado nesta entrega |
| --- | --- | --- |
| `npm run dev` | `vite` | sobe em `http://localhost:<porta>/`, placeholder renderiza, HMR ok |
| `npm run build` | `tsc -b && vite build` | build de produção gerado em `dist/` sem erros |
| `npm run preview` | `vite preview` | serve o build de `dist/`, `200` na raiz |
| `npm run typecheck` | `tsc -b` | 0 erros |
| `npm run lint` | `oxlint` | 0 warnings/erros no código do projeto (overrides documentados acima) |
| `npm run test:e2e` | `playwright test` | 2/2 passam (`chromium-desktop` + `chromium-mobile`) contra o placeholder |
| `npm run lighthouse` | `lhci autorun` | roda 3 medições, grava relatórios em `.lighthouseci/`, assertions em `warn` (ver seção 1) |
