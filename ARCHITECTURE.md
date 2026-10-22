# Arquitetura — NFT Marketplace

Este documento é o entregável de arquitetura das Tasks 0.1–0.3 (Fase 0 —
Fundação e contratos), das Tasks 1.1–1.2 (Fase 1 — Shell, roteamento e
design system) e das Tasks 2.1–2.3 (Fase 2 — Mocking com MSW) do `PLAN.md`.
As seções 1–5 descrevem a Fase 0: stack, estrutura de pastas, contratos
REST/tipos compartilhados, a chave de idempotência de pedido, a regra de
precisão de valores em ETH, e a política de cache/retry/invalidação/
cancelamento/isolamento do TanStack Query — incluindo a interação escolhida
para atualização otimista com rollback. A seção 6 descreve a Fase 1: as 9
rotas da seção 3 do readme, os guards de rota privada (com sessão mock
provisória), o layout responsivo e os skeletons com shimmer. A seção 8
descreve a Fase 2: os handlers MSW dos 8 recursos, o estado
persistido/reset, as fixtures, os cenários de rede/falha configuráveis e o
binding Socket.IO.

As fases seguintes (3–12, `PLAN.md`) implementam sessão real, telas de
produto, cliente de tempo real, testes e deploy sobre esta fundação. Nada
neste documento implementa fluxo de UI de produto — isso é escopo dos
agentes `agent-auth`, `agent-catalog`, `agent-cart`, `agent-realtime`,
`agent-checkout`, `agent-account`.

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
| Componentes | shadcn/ui (`-b radix`, preset `nova`) | `components.json`; tokens visuais ainda placeholder (ver §6.5 — ninguém confrontou com o Figma real ainda) |
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
- Lógica de negócio de qualquer tela (catálogo, carrinho, checkout, perfil,
  carteiras, login/cadastro real) — Fases 3–8 (`agent-auth`, `agent-catalog`,
  `agent-cart`, `agent-checkout`, `agent-account`). A Fase 1 (`agent-shell`,
  seção 6 abaixo) só entrega o "casco": rotas, guards, layout e skeletons.
- Suites Playwright reais dos 12 cenários da seção 9 — Fase 10
  (`agent-tests`). `tests/e2e/smoke.spec.ts` só comprova que o pipeline de
  teste roda de ponta a ponta.
- Lighthouse com thresholds em `error` e páginas reais — Fase 11
  (`agent-quality`).

## 6. Shell, rotas e sessão mock (Fase 1 — Tasks 1.1/1.2, `agent-shell`)

Esta seção documenta o que a Fase 1 adicionou sobre a fundação das seções
1–4: as 9 rotas da seção 3 do readme, os guards de rota privada, o layout
responsivo e os skeletons com shimmer. Nenhum item aqui implementa fluxo de
negócio (isso são as Fases 3–8) — é só o "casco" navegável.

### 6.1 Rotas (TanStack Router, file-based)

| Tela (readme §3) | Rota | Arquivo | Privada? |
| --- | --- | --- | --- |
| Início | `/` | `src/routes/index.tsx` | Não |
| Detalhes do NFT | `/nfts/$nftId` | `src/routes/nfts.$nftId.tsx` | Não |
| Carrinho de NFTs | `/cart` | `src/routes/cart.tsx` | Não |
| Pagamento | `/checkout` | `src/routes/checkout.tsx` | Sim |
| Confirmação de pedido | `/orders/$orderId` | `src/routes/orders.$orderId.tsx` | Sim |
| Login | `/login` | `src/routes/login.tsx` | Não |
| Cadastro | `/register` | `src/routes/register.tsx` | Não |
| Perfil do colecionador | `/account/profile` | `src/routes/account.profile.tsx` | Sim |
| Carteiras | `/account/wallets` | `src/routes/account.wallets.tsx` | Sim |

`/cart` **não** é privada: readme §3 "Carrinho" exige "preservar os itens do
visitante ao autenticar", ou seja, um carrinho de visitante precisa existir
sem login. As 4 rotas privadas batem com readme §3 "Conta e sessão"
("Checkout, perfil, carteiras... exigem autenticação") — "favoritos" não é
uma tela própria entre as 9 (vive dentro do catálogo/detalhe) e "pedidos" é
coberto por `/orders/$orderId` (a tela de confirmação).

Parâmetros de busca tipados (readme §3 "Catálogo e detalhe" + §4):

- `/` reaproveita o contrato `NftListQuery` (`shared/types/nft.ts`) como
  schema de busca — mesmo shape na URL e na API, sem tradução — via
  `src/features/catalog/search.ts#catalogSearchSchema`. `page`/`pageSize`
  sempre têm default (1/12) e aparecem resolvidos na URL após qualquer
  navegação; os demais campos (`search`, `category[]`, `priceMinEth`,
  `priceMaxEth`, `sortKey`, `sortOrder`) ficam `undefined` quando ausentes/
  inválidos. A Fase 4 (`agent-catalog`) consome `Route.useSearch()`
  diretamente como `NftListQuery` para `useNftsQuery`.
- `/nfts/$nftId` aceita `editionId` opcional (deep link para uma edição
  específica).
- `/login` aceita `redirect` opcional (ver guard abaixo).

Nota de tipagem: como `NftListQuery.page`/`pageSize` são obrigatórios no
contrato (Fase 0), `catalogSearchSchema` usa o escape hatch `SearchSchemaInput`
do TanStack Router para declarar a entrada de navegação (`<Link to="/">`)
como `Partial<NftListQuery>` (tudo opcional) mantendo a saída
(`Route.useSearch()`) como `NftListQuery` completo e resolvido — sem isso,
todo link para `/` seria obrigado a passar `page`/`pageSize` explicitamente.

### 6.2 Rota inexistente e acesso direto

`src/routes/__root.tsx` define `notFoundComponent` na rota raiz, usado tanto
quando nenhuma rota casa com o caminho (acesso direto a uma URL inventada)
quanto quando uma rota filha lançar `notFound()` explicitamente (ex.: NFT
inexistente, Fase 4). Todas as 9 rotas são code-split
(`autoCodeSplitting: true` no plugin) e foram testadas manualmente com
acesso direto por URL colada + refresh (ver 6.3).

### 6.3 Guard de rota privada — sessão mock (PROVISÓRIO)

A sessão real (login/logout via API, expiração, limpeza de cache — Fase 3,
`agent-auth`) ainda não existe. Para poder testar os guards agora, a Fase 1
introduz uma sessão de brinquedo em `src/shared/session/`:

- `mockSession.ts` — guarda um usuário fictício em `localStorage`
  (`nft-marketplace:mock-session`), com `login`/`logout`/`isAuthenticated`/
  `get`/`subscribe`. Lê sempre direto do `localStorage` (sem cache além do
  necessário para `useSyncExternalStore` — ver nota de implementação no
  próprio arquivo sobre por que a leitura precisa devolver a mesma
  referência quando o valor não mudou, senão o React entra em loop de
  re-render).
- `useMockSession.ts` — hook reativo (`useSyncExternalStore`) usado pelo
  header para alternar Login/Cadastro ↔ Perfil/Carteiras/Sair.
- `requireAuth.ts` — guard usado no `beforeLoad` das 4 rotas privadas:
  lança `redirect({ to: '/login', search: { redirect: location.href } })`
  quando deslogado. `location.href` já inclui path + querystring, então um
  link privado com parâmetros (ex.: um checkout com carrinho específico)
  retoma exatamente onde parou.
- `safeRedirect.ts` — `/login` só aceita `redirect` se for um caminho
  interno (`/algo`); qualquer valor absoluto ou `//host` cai no fallback
  `/`, para não abrir um open-redirect a partir de um link de login
  manipulado.
- `/login` e `/register` têm um botão "(simulado)" que autentica
  instantaneamente (sem formulário/validação/API) só para exercitar o
  guard + retomada ponta a ponta. Isso **não** é o login real exigido pela
  seção 3 do readme — é descartável e será substituído na Fase 3.

`agent-auth` deve: (1) substituir `mockSession` por sessão real baseada em
`useSessionQuery`/`useLoginMutation`/`useLogoutMutation` (já existentes em
`features/account/hooks/useSessionQuery.ts`, plumbing da Fase 0); (2) manter
a mesma assinatura de `requireAuth` (ou equivalente) nas 4 rotas privadas;
(3) não deixar nenhum import de `mockSession` sobrevivendo fora de
`src/shared/session/` após a troca.

Validado manualmente (fluxo completo, ver histórico de execução desta
task): acesso direto a `/account/profile` deslogado → redireciona para
`/login?redirect=%2Faccount%2Fprofile` → login simulado → retoma em
`/account/profile` → refresh mantém a sessão (via `localStorage`) → logout
→ acesso direto a `/account/wallets` → redireciona de novo. `/checkout` e
`/orders/$orderId` seguem o mesmo guard.

### 6.4 Layout responsivo

`src/components/layout/app-shell.tsx` envolve toda a árvore de rotas
(montado em `src/routes/__root.tsx`): `SiteHeader` (logo + nav + sessão) +
`<main>` com container centralizado (`max-w-6xl`, padding responsivo) +
`SiteFooter`. `SiteHeader` colapsa a navegação num painel de disclosure
abaixo de `md` (768px) — testado nos três breakpoints do readme §8 (390,
768, 1440) sem overflow horizontal.

### 6.5 Design tokens — placeholder (readme §1)

O link do Figma real não está acessível neste ambiente de execução. Os
tokens usados (cores claro/escuro, radius, a fonte `Geist Variable`, escala
de espaçamento/tipografia do Tailwind v4) são os do preset `shadcn/ui`
"radix-nova" já configurado na Fase 0 (`src/index.css`) — um sistema neutro
e consistente, **não** a identidade visual final do desafio. Isso está
marcado explicitamente como placeholder no próprio `src/index.css` (comentário
acima do bloco de tokens). Antes da entrega final, alguém com acesso ao
Figma precisa: conferir paleta de cores, família/escala tipográfica e
espaçamentos contra o layout real, e ajustar as variáveis em `:root`/`.dark`
e `@theme inline` de acordo — sem precisar tocar nos componentes que as
consomem (`Button`, `Skeleton`, etc. usam só as variáveis semânticas).

### 6.6 Skeletons com shimmer (readme §8)

- `src/components/ui/skeleton.tsx` — primitivo (`<Skeleton />`), aplica a
  classe utilitária `.skeleton-shimmer` (`src/index.css`): gradiente linear
  animado via `background-position` (não `animate-pulse` do Tailwind, para
  poder desligar só o movimento em `prefers-reduced-motion: reduce` —
  verificado via `page.emulateMedia({ reducedMotion: 'reduce' })` que
  `animationName` vira `none` sem remover o elemento nem suas dimensões).
  Quem usa o primitivo é responsável por fixar `h-*`/`w-*`/`aspect-*` iguais
  ao conteúdo final, para não haver layout shift quando o dado real
  substituir o skeleton.
- `src/features/catalog/components/catalog-grid-skeleton.tsx` +
  `nft-card-skeleton.tsx` — grade do catálogo (Início), mesmo grid
  responsivo (2/3/4 colunas) que a Fase 4 usará.
- `src/features/catalog/components/nft-detail-skeleton.tsx` — duas colunas
  (galeria + informações/compra) do detalhe do NFT.
- `src/features/cart/components/cart-summary-skeleton.tsx` — linhas de item
  + bloco de totais (subtotal/desconto/taxa de rede/total) do resumo do
  carrinho.

As três páginas correspondentes (`/`, `/nfts/$nftId`, `/cart`) já renderizam
esses skeletons como conteúdo placeholder (não há dado real ainda); as
Fases 4/5 trocam o skeleton pelo conteúdo definitivo quando `isLoading` for
`true`, mantendo os mesmos componentes.

## 7. Scripts (readme §12)

| Script | Comando | Status verificado nesta entrega |
| --- | --- | --- |
| `npm run dev` | `vite` | sobe em `http://localhost:<porta>/`, as 9 rotas (Fase 1) resolvem, HMR ok |
| `npm run build` | `tsc -b && vite build` | build de produção gerado em `dist/` sem erros, 9 rotas code-split |
| `npm run preview` | `vite preview` | serve o build de `dist/`, `200` na raiz |
| `npm run typecheck` | `tsc -b` | 0 erros |
| `npm run lint` | `oxlint` | 0 warnings/erros no código do projeto (overrides documentados acima) |
| `npm run test:e2e` | `playwright test` | 2/2 passam (`chromium-desktop` + `chromium-mobile`) contra o shell/skeleton da Fase 1 |
| `npm run lighthouse` | `lhci autorun` | roda 3 medições, grava relatórios em `.lighthouseci/`, assertions em `warn` (ver seção 1) |

`npm run dev`/`npm run build`/`npm run preview` só sobem a camada de mocks
(seção 8) quando `VITE_ENABLE_MOCKS=true` está definido no ambiente — ver
seção 8.1. Sem essa variável, o build de produção nem inclui o código do
MSW no bundle (confirmado: o chunk `browser-*.js`, ~445 kB, só aparece no
`dist/` quando a flag está ativa — ver seção 8.1).

## 8. Mocking com MSW (Fase 2 — Tasks 2.1, 2.2, 2.3, `agent-mocks`)

Esta seção documenta os handlers REST dos 8 recursos da seção 5 do readme, o
estado persistido/reset, as fixtures, os cenários de rede/falha
configuráveis (seção 6) e o binding Socket.IO (seção 6/7) — tudo em
`src/features/mocks/`. Nenhum item desta seção implementa UI; os
componentes/hooks das Fases 3–8 só consomem os contratos de
`shared/types`/`features/*/api` já existentes (Fase 0), sem saber que a
resposta vem de um mock.

### 8.1 Estrutura de pastas e ativação

```
src/features/mocks/
  scenario.ts              # MockScenarioConfig: latência, falhas, timeouts, cenários de pagamento/idempotência (seção 8.5)
  browser.ts                # setupWorker(...handlers) + window.__mocks__ (painel de controle, seção 8.8)
  server.ts                 # setupServer(...handlers) — mesmos handlers, para Node (Playwright/testes futuros)
  db/
    types.ts                 # Shape interno do "banco" simulado (nunca exposto 1:1 pelos handlers)
    seed.ts                   # Fixtures "de leitura fácil" → MockDb completo (hash de senha, carrinho calculado, etc.)
    store.ts                  # getDb()/persistDb()/resetMockData() — localStorage (ou memória em Node), seção 8.2
  fixtures/                  # Usuários, NFTs, coleções, criadores, carteiras, cupons (seção 8.3)
  utils/                      # decimal.ts, http-error.ts, with-scenario.ts, auth.ts, cart.ts, quote.ts, nft-query.ts, password.ts, ids.ts, storage.ts
  handlers/
    session.ts, nfts.ts, favorites.ts, cart.ts, quote.ts, orders.ts, profile.ts, wallets.ts  # os 8 recursos (seção 8.4)
    control.ts                 # painel de controle REST (`/api/__mock__/*`, fora do contrato — seção 8.8)
    index.ts                   # combina tudo em `handlers: AnyHandler[]`
  realtime/
    events.ts                  # binding Socket.IO (seção 8.7)
    mutations.ts                # ponte entre mutações no `MockDb` e os eventos `nft.updated`/`order.updated`
```

Ativação por configuração (seção 6: "A camada de mocks deve ser ativada por
configuração e estar disponível no build de demonstração"):
`VITE_ENABLE_MOCKS=true` no ambiente (`.env.local`, `.env.production`, ou
variável de ambiente do provedor de deploy) faz `src/main.tsx` importar
`features/mocks/browser` dinamicamente e chamar `worker.start()` ANTES de
renderizar a árvore React (Fase 0/1, não alterado aqui). Como o import é
dinâmico e a condição é uma comparação de string estática, o Vite
tree-shakeia o módulo inteiro (handlers, fixtures, `@mswjs/socket.io-binding`
etc.) quando a flag não está em `'true'` no momento do `build` — verificado
nesta entrega: o bundle de produção sem a flag não contém nenhum chunk de
mock; com a flag, aparece um chunk `browser-*.js` dedicado (~445 kB) com
todo o código deste diretório. Isso é o que permite a MESMA base de código
servir dev, demo publicado (com mocks) e uma eventual build real (sem
mocks, se um dia houver backend) sem nenhuma branch de código no
app/componentes — só a env var decide.

### 8.2 Estado persistido e reset (seção 6)

`db/store.ts` mantém um `MockDb` único em memória, carregado/persistido via
`utils/storage.ts` (que usa `localStorage` no browser — sobrevive a refresh
— e cai para um `Map` em memória em Node puro sem `localStorage`, ex.:
`msw/node` fora de jsdom). Todo handler segue o padrão
`const db = await getDb(); <mutação>; persistDb(db)`.

`db/seed.ts#createSeedDb()` é a ÚNICA função que conhece a transformação de
fixtures "fáceis de ler" (seção 8.3) para o shape interno completo (preços/
estoque já calculados, senha com hash — nunca texto puro, carrinho dos
usuários com `subtotalEth` já derivado). `db/types.ts#MockDb.schemaVersion`
é comparado contra o valor atual a cada boot: se o `localStorage` tiver um
schema antigo (porque as fixtures mudaram entre entregas), o mock refaz o
seed automaticamente — ninguém herda um banco "meio migrado".

Reset (seção 6: "o reset deve restaurar integralmente um cenário
conhecido"): `resetMockData()` (`db/store.ts`) descarta QUALQUER estado
criado durante uma sessão de testes (pedidos, cupom aplicado, favoritos,
carrinho, carteiras, preços alterados via `nft.updated`) e reconstrói o
`MockDb` do zero a partir das fixtures. Disponível por dois caminhos (ver
seção 8.8): `POST /api/__mock__/reset` (HTTP) e `window.__mocks__.resetAll()`
(JS direto, inclui também resetar o `scenario.ts` para o padrão).

### 8.3 Fixtures (seção 6: "≥2 usuários", "variedade suficiente para filtros e paginação")

- **NFTs** (`fixtures/nfts.ts#buildNftFixtures()`): 48 itens determinísticos
  (6 categorias × 8 itens — `art`, `music`, `photography`, `gaming`,
  `collectibles`, `virtual-worlds`), com 1 a 3 edições cada, preços e
  estoques variados, `createdAt` espalhado nos últimos ~90 dias (para
  exercitar `sortKey: 'newest'`). Nenhum `Math.random()` em lugar algum —
  o mesmo `buildNftFixtures()` sempre produz os mesmos 48 itens, nos mesmos
  ids, o que é o que torna o reset reproduzível. Três ids reservados para
  cenários determinísticos (usados também pelo painel de controle):
  - `nft-sold-out-demo` — todas as edições com `availableQuantity: 0`.
  - `nft-low-stock-demo` — uma edição com `availableQuantity: 1`.
  - `nft-price-drift-demo` — alvo recomendado para
    `POST /api/__mock__/simulate/nft-update` (seção 8.7/roteiro da seção 7).
  - Imagens (`coverImageUrl`/`avatarUrl`) são SVGs inline em data URI
    (`fixtures/placeholder-image.ts`) — decisão registrada aqui pelo mesmo
    motivo da Fase 1 (Figma real inacessível neste ambiente): zero
    dependência de rede/CDN externo, o que mantém o build de demonstração
    funcionando totalmente offline/sem serviço externo. Troca por assets
    reais do Figma não exige mudar o contrato (`coverImageUrl` continua
    `string`).
- **Usuários** (`fixtures/users.ts`): `ana@example.com` (favoritos, carrinho
  com 2 itens, 2 carteiras) e `bruno@example.com` (1 favorito, carrinho
  vazio, 1 carteira) — senha `Colecionar123!` para ambos. Dois usuários com
  estados iniciais diferentes de propósito, para exercitar "vazio" sem
  precisar de um terceiro usuário.
- **Cupons** (`fixtures/coupons.ts`): `BEMVINDO10` (válido, 10%),
  `PROMO20` (válido, 20%, expira em 2027), `EXPIRADO15` (existe, mas
  `expiresAt` no passado → 409 `COUPON_UNAVAILABLE`), `ESGOTADO5` (existe,
  mas `usedCount === maxUses` → 409 `COUPON_UNAVAILABLE`). Qualquer outro
  código → 404 `NOT_FOUND` (`resource: 'coupon'`). Nenhum destes precisa de
  um toggle de cenário — são deterministicamente "inválido"/"expirado" só
  pelos dados da fixture, reproduzíveis a qualquer momento.

### 8.4 Handlers REST — os 8 recursos (seção 5)

Todo handler usa exclusivamente os tipos de `shared/types` (zero shape
duplicado) e é envolvido por `utils/with-scenario.ts#withScenario(endpoint, fn)`,
que aplica os cenários de rede/falha (seção 8.5) e converte qualquer
`ApiMockError` lançado por `fn` (`utils/http-error.ts`) no envelope de erro
único `ApiErrorResponse` — nunca um shape de erro alternativo.

| Recurso | Rotas | Observações |
| --- | --- | --- |
| Sessão/conta | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/session`, `POST /api/auth/logout` | Sessão simulada = PONTEIRO único em `MockDb.session` (ver 8.4.1), não cookie real ainda. Login/registro mesclam o carrinho de visitante no carrinho do usuário (seção 3: "preservar os itens do visitante ao autenticar"). |
| NFTs | `GET /api/nfts`, `GET /api/nfts/:nftId` | Busca/filtro/ordenação/paginação em `utils/nft-query.ts`; `isFavorited` só presente quando há usuário autenticado. |
| Favoritos | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:nftId` | Exigem sessão; `favorites` é `Record<NftId, favoritedAt>` por usuário — persiste entre sessões. |
| Carrinho | `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id` | Carrinho de visitante OU do usuário autenticado (ver 8.4.1); `GET`/mutations sempre recalculam `unitPriceEth`/`availableQuantity`/`subtotalEth` a partir do estado ATUAL da edição (`utils/cart.ts#refreshCartPricing`) — um `nft.updated` do painel de controle aparece no carrinho na próxima leitura, sem precisar re-adicionar o item. |
| Cotação | `GET /api/carts/:cartId/quote`, `POST /api/carts/:cartId/coupon`, `DELETE /api/carts/:cartId/coupon` | `quoteVersion` é baseado num "fingerprint" dos itens/preços/cupom (ver 8.6.2) — nunca incrementa só porque a rota foi chamada de novo sem nada mudar. |
| Pedidos | `POST /api/orders` (header `Idempotency-Key`), `GET /api/orders/:orderId` | Idempotência completa (seção 8.6.1) + resolução assíncrona `pending → confirmed/refused` (seção 8.6.3). |
| Perfil | `GET /api/profile`, `PATCH /api/profile`, `PATCH /api/profile/avatar`, `POST /api/profile/password` | Validação de e-mail duplicado (409), avatar como data URL (contrato já previa isso na Fase 0), senha nunca comparada/guardada em claro (`utils/password.ts`, SHA-256 com "sal" fixo — ver nota de segurança no próprio arquivo). |
| Carteiras | `GET /api/wallets`, `PUT /api/wallets/:kind` | No máximo uma carteira por `kind` (`primary`/`secondary`) por usuário — reenviar o mesmo `kind` atualiza em vez de duplicar. |

#### 8.4.1 Sessão simulada — ponteiro único (decisão + limitação deliberada)

`utils/auth.ts#currentUser()`/`requireUser()` leem `db.session: { userId,
token, expiresAt } | null` — um ÚNICO ponteiro "sessão ativa agora", não um
cookie real por aba/usuário. Isso é suficiente para:

- os 8 recursos responderem de forma consistente e tipada (o que esta Task
  pedia: "GET /session... precisa existir e ser substituível depois sem
  `agent-auth` ter que recriar o contrato" — o contrato `SessionResponse`/
  `LoginResponse`/etc. não muda nunca, só a implementação interna pode);
- os guards de rota da Fase 1 e os testes/roteiros da seção 6 funcionarem
  (login → ações autenticadas → logout → 401 de novo);
- o carrinho "de visitante" (`db.guestCart`, chave `'guest'`) e o carrinho
  "do usuário atual" (`db.users[i].cart`, chave = `user.id`) coexistirem
  exatamente como `queryKeys.cart.detail(userId | 'guest')` já antecipa em
  `shared/query/keys.ts` (Fase 0).

LIMITAÇÃO deliberada: não suporta duas sessões "simultâneas" (duas abas
logadas como usuários diferentes ao mesmo tempo veriam o mesmo ponteiro).
Isso é aceitável para o escopo do mock (dev/demo/Playwright rodam
tipicamente uma sessão de navegador por vez) e **não** é o que o critério
eliminatório "exposição de dados entre usuários" cobra — aquele critério é
sobre o cache do TanStack Query/subscriptions não sobreviverem a um
logout/troca de usuário NO MESMO navegador (responsabilidade do
`queryClient.clear()` já documentado na seção 4.5, mais a limpeza de
listeners do socket na Fase 6) — o ponteiro de sessão do mock é consistente
com isso: cada login/logout substitui/zera o ponteiro inteiro. `agent-auth`
(Fase 3) decide se evolui isto para cookie `httpOnly` real; o contrato
público não precisa mudar para isso acontecer.

#### 8.4.2 Mapeamento de erros não previstos literalmente no enum (decisões de nomenclatura)

`ApiErrorBody` (Fase 0, `shared/types/errors.ts`) não tem um código dedicado
para "carrinho não encontrado" nem para "cotação desatualizada" — os
handlers reaproveitam os códigos mais próximos semanticamente, sem adicionar
nenhum valor novo ao enum:

- Carrinho/cotação para um `cartId` inexistente → 404 `NOT_FOUND`,
  `resource: 'cart_item'` (não há `'cart'` no enum; `'cart_item'` é o mais
  próximo).
- `POST /orders` com `quoteVersion` diferente da cotação atual, OU algum
  item sem estoque suficiente no momento da confirmação → 409 `CONFLICT`,
  `reason: 'STOCK_UNAVAILABLE'` (a causa raiz de uma cotação desatualizada
  É uma mudança de preço/disponibilidade — o mesmo motivo que já tem um
  `reason` dedicado). `agent-checkout` (Fase 7) deve tratar
  `409 STOCK_UNAVAILABLE` na criação do pedido como "cotação desatualizada
  — busque uma nova cotação e peça confirmação de novo" (seção 7: "O
  checkout impede a confirmação com uma cotação desatualizada").

### 8.5 Cenários de rede/falha configuráveis e reproduzíveis (seção 6)

`scenario.ts#MockScenarioConfig` é o painel único de configuração, com
persistência própria (mesma estratégia de `localStorage`/memória de 8.2) e
chave de endpoint (`MockEndpointKey`, ex.: `'nfts.list'`, `'orders.create'`)
documentando exatamente qual operação cada campo afeta. Todo handler passa
por `withScenario(endpointKey, fn)`, que resolve nesta ordem:

1. `scenario.networkDown.includes(endpoint)` → `HttpResponse.error()`
   (falha de conexão simulada — o client vê um erro de rede, sem resposta
   HTTP alguma).
2. `scenario.forceError[endpoint]` → responde imediatamente com o
   status/corpo configurado (qualquer 4xx/5xx arbitrário).
3. `scenario.forceTimeout.includes(endpoint)` → atrasa a resposta além de
   `HTTP_CLIENT_TIMEOUT_MS` (`shared/api/http.ts`, 10 s — configurado nesta
   entrega especificamente para que estes cenários sejam observáveis: sem
   um timeout no client Axios, uma resposta atrasada ficaria pendurada para
   sempre em vez de rejeitar com `ECONNABORTED`). O client desiste antes da
   resposta chegar.
4. Caso contrário: espera uma latência aleatória dentro de
   `scenario.latencyMs` (ou do override por endpoint em
   `latencyOverridesMs`) e then executa o handler normalmente. Como essa
   latência é sorteada por requisição, duas chamadas concorrentes com
   parâmetros diferentes (ex.: troca rápida de filtro no catálogo) podem
   legitimamente resolver fora de ordem — exatamente o cenário "respostas
   fora de ordem" da seção 6; cabe ao `TanStack Query` (política já
   documentada na seção 4.4) descartar a resposta obsoleta.

Campos adicionais do `MockScenarioConfig` cobrem os cenários remanescentes
da seção 6 que não fazem sentido como "erro genérico por endpoint":

| Cenário (seção 6) | Campo | Efeito |
| --- | --- | --- |
| Sessão expirada | `sessionForceExpired: boolean` | Qualquer endpoint autenticado passa a responder 401 `EXPIRED_SESSION`, mesmo com uma sessão "válida" guardada. |
| Sucesso vazio | `forceEmpty: MockEndpointKey[]` | Hoje only `'nfts.list'`: força `{ items: [], total: 0 }` independente dos filtros enviados. |
| Timeout pós-criação de pedido + recuperação por idempotência | `ordersCreateTimeoutOnce: boolean` | Ver 8.6.1. |
| Pagamento confirmado/recusado | `paymentOutcome: 'confirmed' \| 'refused' \| 'pending-forever'` + `paymentResolutionDelayMs` | Ver 8.6.3. |

Seleção/reset de cenário (documentável no README final do `agent-devops`,
seção 12 do readme): ver painel de controle na seção 8.8 — mesma mecânica
usada para resetar os dados.

### 8.6 Pedidos — idempotência, cotação e pagamento (seção 5/6/7)

#### 8.6.1 Idempotência (contrato completo já em `shared/types/orders.ts`, Fase 0)

`handlers/orders.ts`: `db.idempotency[key] = { payload, orderId, pendingTimeout }`.

- Chave nova → valida carrinho/carteira/cotação, cria o `Order` (`status:
  'pending'`), agenda a resolução assíncrona (8.6.3) e grava o registro de
  idempotência.
- MESMA chave + MESMO payload (`JSON.stringify` do body) → devolve
  imediatamente o pedido já existente (mesmo `OrderId`), sem repetir
  nenhuma validação — cobre clique repetido e retry automático.
- MESMA chave + payload DIFERENTE → 409 `CONFLICT`,
  `reason: 'IDEMPOTENCY_KEY_MISMATCH'`.

Cenário dedicado "timeout após criação do pedido, com recuperação por
idempotência" (seção 6): ativado via
`window.__mocks__.setScenario({ ordersCreateTimeoutOnce: true })` (ou
`POST /api/__mock__/scenario`). Com a flag ativa, a 1ª chamada para uma
chave NOVA cria o pedido normalmente (ele já existe no backend simulado,
já agendado para resolver) mas a ENTREGA da resposta HTTP é atrasada além
do timeout do client — o client vê um erro de timeout achando que nada foi
criado. O reenvio (automático ou manual) com a MESMA chave cai no caminho
"mesma chave + mesmo payload" acima, que responde imediatamente com o
pedido já criado. Reproduzível à vontade: a flag persiste até ser
desligada; cada nova chave de idempotência repete o mesmo comportamento.

#### 8.6.2 `quoteVersion` — fingerprint, não contador de leituras

`utils/quote.ts#computeQuote()` deriva `quoteVersion` de um "fingerprint"
(itens + preços + quantidades + disponibilidade + cupom) guardado em
`db.quoteState[cartId]`: a versão só incrementa quando esse fingerprint
muda de uma chamada para outra, nunca só porque `GET /quote` foi chamado de
novo sem nada ter mudado de verdade. Isso é o que permite ao checkout (Fase
7) usar um `quoteVersion` já conhecido com segurança (um refetch do React
Query sem mudança real não invalida a cotação que o usuário revisou), ao
mesmo tempo em que qualquer mudança real (preço/estoque via
`nft.updated`, ou aplicar/remover cupom) o invalida de verdade — exatamente
o roteiro da seção 7: "o checkout impede a confirmação com uma cotação
desatualizada".

#### 8.6.3 Resolução assíncrona do pagamento (seção 7)

`realtime/mutations.ts#scheduleOrderResolution()`: ao criar um pedido
`pending`, agenda (via `setTimeout`) a resolução para
`confirmed`/`refused` após `scenario.paymentResolutionDelayMs` (padrão:
2000 ms), decidido por `scenario.paymentOutcome` — **lido no momento em que
o timer dispara**, não no momento em que foi agendado, para permitir
configurar o cenário depois de iniciar a criação do pedido sem corrida.
`paymentOutcome: 'pending-forever'` não agenda nada: o pedido fica
`pending` indefinidamente, simulando "interrupção de conexão enquanto o
pedido está pendente" (seção 7) — só uma chamada explícita a
`forceOrderStatus` (via `POST /api/__mock__/simulate/order-update`, seção
8.8) o resolve, simulando a reconexão.

Só na confirmação (`realtime/mutations.ts#settleOrder`, `outcome:
'confirmed'`): debita o estoque de cada edição comprada (emitindo
`nft.updated` para cada uma — seção 6: "mudanças nos dados simulados devem
ser refletidas tanto nas respostas REST quanto nos eventos
correspondentes") e remove do carrinho ORIGINAL exatamente os itens/
quantidades comprados (seção 3: "após confirmação, remover do carrinho
apenas os itens e quantidades comprados"; testado manualmente nesta entrega
— ver seção 8.9). Numa recusa, carrinho e estoque permanecem intactos
(seção 3: "Preservar os itens em falhas"). Pedidos confirmados/recusados
são terminais (`settleOrder` ignora qualquer chamada subsequente num
pedido que já saiu de `pending`) — seção 7.

### 8.7 Binding Socket.IO — transporte e limitações (seção 6/7, Task 2.3)

`realtime/events.ts` usa `ws.link()` (núcleo do `msw`) +
`@mswjs/socket.io-binding#toSocketIo()` para decodificar/codificar o
protocolo Engine.IO/Socket.IO por cima da conexão WebSocket crua que o
`socket.io-client` REAL abre (`features/realtime/client/socket.ts`, Fase 0;
o app força `transports: ['websocket']`, então não há fallback para
polling HTTP a interceptar). `toSocketIo()` lida com o handshake inicial
(pacotes Engine.IO `0`/Socket.IO `40`) automaticamente — é isso que permite
`socket.on('nft.updated', ...)` no cliente real funcionar sem nenhum código
adicional no lado do cliente (Fase 6 só precisa chamar `.connect()`/`.on()`
normalmente).

**Desvio documentado, com evidência, no padrão de URL do `ws.link()`:**
`msw@3.0.3` expõe `ws.link(pattern)` a partir de um módulo interno chamado
literalmente "experimental". Testado manualmente nesta entrega: com
qualquer `pattern` diferente do literal `'*'` — `RegExp` (`/\/socket\.io\//`),
string relativa (`'/socket.io/'`), string absoluta
(`'ws://host:porta/socket.io/'`) — o listener de `connection` registrado
via `ws.link(pattern).addEventListener('connection', fn)` NUNCA é invocado;
a conexão é tratada como "sem handler correspondente" e passa de verdade
para a rede real (confirmado isolando `worker.start({ onUnhandledFrame:
'warn' })`, que loga explicitamente `[MSW] Warning: intercepted a
WebSocket connection without a matching event handler` para a URL exata
`ws://localhost:<porta>/socket.io/?EIO=4&transport=websocket` — ou seja, o
`WebSocketInterceptor` por baixo do `msw` está ativo e INTERCEPTANDO a
conexão corretamente; só o roteamento por padrão de URL do `ws.link()`
falha em casar). Isolar o mesmo `WebSocketInterceptor`
(`@mswjs/interceptors/WebSocket`) usado por baixo do `msw`, aplicado
diretamente (sem passar pelo `msw`), funciona perfeitamente — o que
localiza o bug especificamente no roteamento de `ws.link()`, não no
mecanismo de interceptação em si nem no ambiente/bundler.

Correção adotada: `ws.link('*')` (comprovadamente funcional) + filtragem
manual por URL dentro do próprio handler. Conexões que não sejam para
`/socket.io/` (ex.: o WebSocket de HMR do próprio Vite em `npm run dev`)
chamam `connection.server.connect()` explicitamente para serem encaminhadas
de verdade — a partir daí, `WebSocketServerConnection`
(`@mswjs/interceptors`) encaminha mensagens/fechamento bidirecionalmente
sem nenhum código manual adicional (testado: o HMR do Vite continua
funcionando normalmente com os mocks ativos). Sem esse cuidado, QUALQUER
`new WebSocket(...)` da página (não só o do app) passaria a ser
interceptado, já que a interceptação reescreve o `WebSocket` GLOBAL do
ambiente.

**Limitação de transporte entre ambientes:** a interceptação só reescreve
o `WebSocket` GLOBAL. Num bundle para browser — dev, build de demonstração,
Playwright-em-browser (todos os ambientes reais desta aplicação) — o Vite
resolve `socket.io-client` → `engine.io-client` para a variante que usa
esse `WebSocket` global (confirmado inspecionando o campo `"browser"` do
`package.json` de `engine.io-client`, que remapeia
`transports/websocket.node.js` → `transports/websocket.js` só em bundlers).
A interceptação funciona de ponta a ponta nesses ambientes — verificado
manualmente tanto contra `npm run dev` quanto contra `vite preview` do
build com `VITE_ENABLE_MOCKS=true` (handshake completo + evento
`nft.updated` recebido). Em Node.js PURO (sem bundler, ex.: alguém rodando
`server.ts` fora de um browser/jsdom), `socket.io-client` importa a
variante que usa o pacote `ws` em vez do `WebSocket` global, e esta
interceptação não a alcança — documentado também em `server.ts`. A
aplicação real nunca roda em Node puro, então isto não afeta o produto;
só um teste Node "cru" de WebSocket precisaria rodar num browser real.

`@mswjs/socket.io-binding` declara peer dependency `msw@^2.10.2`; este
projeto está em `msw@^3.0.3` (instalado com `--legacy-peer-deps`,
registrado em `package.json`/`package-lock.json`). A API usada
(`toSocketIo(connection)` operando sobre `connection.client`/
`connection.server`, que são tipos de `@mswjs/interceptors`, não do `msw`)
não mudou entre essas versões — só o roteamento por padrão do `ws.link()`
do `msw`, contornado acima, foi afetado.

`realtime/mutations.ts` é a ponte entre qualquer mutação no `MockDb` e os
eventos: `applyNftUpdate()` (usada tanto pelo endpoint de controle quanto
pela confirmação de pedido) incrementa `Nft.version` e emite `nft.updated`;
`applyOrderStatusChange()` incrementa um contador de versão por pedido
(`db.orderEventVersions`, não exposto no contrato `Order`) e emite
`order.updated`. O envelope (`id`, `resource`, `resourceId`, `version`,
`occurredAt`, `payload`) é exatamente o `RealtimeEventEnvelope` da Fase 0
(`shared/types/events.ts`) — a tolerância a duplicata/evento antigo no
cliente (Fase 6) se baseia neste `version` monotônico por recurso.

### 8.8 Painel de controle (seleção/reset de cenário, disparo de eventos)

Fora do contrato dos 8 recursos (seção 5) — usado só por testes/ferramentas,
nunca por `features/*` de produto:

| Via | Uso |
| --- | --- |
| `GET /api/__mock__/scenario` | Lê o `MockScenarioConfig` atual. |
| `POST /api/__mock__/scenario` | Mescla um `Partial<MockScenarioConfig>` (arrays/objetos são SUBSTITUÍDOS, não mesclados item a item). |
| `POST /api/__mock__/scenario/reset` | Volta a `defaultScenarioConfig()`. |
| `POST /api/__mock__/reset` | `resetMockData()` + reset de cenário — "cenário conhecido" completo (seção 6). |
| `POST /api/__mock__/simulate/nft-update` | `{ nftId, editionId?, priceEth?, availableQuantity? }` → muda o `MockDb` e emite `nft.updated` (roteiro da seção 7: NFT no carrinho muda de preço durante a navegação). |
| `POST /api/__mock__/simulate/order-update` | `{ orderId, status: 'confirmed' \| 'refused' }` → força a resolução de um pedido (útil com `paymentOutcome: 'pending-forever'`, para simular a reconexão). |
| `window.__mocks__` (`browser.ts`) | Mesmas operações acima, chamadas direto em JS (ex.: `page.evaluate(() => window.__mocks__.resetAll())` em Playwright) — sem round-trip HTTP. Só existe quando `VITE_ENABLE_MOCKS=true` e só no browser. |

Ambos os caminhos (REST e `window.__mocks__`) existem porque alguns
consumidores de teste preferem `page.request.post(...)` e outros preferem
`page.evaluate(...)` direto — nenhum dos dois é consumido pelo código de
produto.

### 8.9 Validação manual desta entrega

Rodado manualmente contra `npm run dev` e contra `vite preview` do build
com `VITE_ENABLE_MOCKS=true` (Playwright headless, sem nenhuma suíte
versionada — isso é a Fase 10/`agent-tests`): catálogo com busca/filtro/
paginação, 404 de NFT inexistente, sessão `null`→401 sem login, login com
credencial errada (400) e correta (200), favoritos/carrinho pré-semeados
por usuário, cupom inválido (404)/expirado (409)/válido (200, com
`quoteVersion` incrementando), carteiras, criação de pedido com
idempotência (replay idêntico, payload divergente → 409), resolução
`pending → confirmed` com débito de estoque e remoção dos itens do
carrinho, cenário `pending-forever` resolvido manualmente via painel de
controle, e o evento `nft.updated`/`order.updated` chegando por um
`socket.io-client` real tanto em `npm run dev` quanto no build de
demonstração servido por `vite preview`.
