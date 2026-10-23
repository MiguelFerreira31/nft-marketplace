# NFT Marketplace

Solução do desafio frontend descrito em [`DESAFIO.md`](DESAFIO.md). Decisões
de arquitetura, contratos e política de cache/estado estão documentadas em
[`ARCHITECTURE.md`](ARCHITECTURE.md); o plano de fases (com os gates de
validação de cada uma) está em [`PLAN.md`](PLAN.md).

**Deploy:** https://nft-marketplace-eta-peach.vercel.app

## Stack

React + TypeScript + Vite, TanStack Router, TanStack Query, Axios, Tailwind
CSS v4, shadcn/ui, MSW (com binding Socket.IO real via
`@mswjs/socket.io-binding`), Vitest, Playwright, Lighthouse CI.

## Setup

```bash
npm install
```

> `.npmrc` já fixa `legacy-peer-deps=true` — necessário porque
> `@mswjs/socket.io-binding@0.2.0` declara peer `msw@^2.10.2` enquanto o
> projeto usa `msw@^3.0.3` (API usada não mudou entre essas versões; ver
> `ARCHITECTURE.md` seção 8 para o detalhe).

## Variáveis de ambiente

| Variável | Onde se aplica | Efeito |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | build-time (Vite) | `true` inclui a camada MSW (handlers REST + binding Socket.IO) no bundle. **Sem ela, a aplicação não tem backend algum** — é obrigatória tanto em desenvolvimento quanto no build de demonstração/produção publicado. |
| `VITE_API_BASE_URL` | build-time (Vite), opcional | `baseURL` do cliente Axios (`src/shared/api/http.ts`). Default `/api` — correto com os mocks na mesma origem; só precisa ser definida se algum dia apontar para um backend real em outra origem. |
| `VITE_SOCKET_URL` | build-time (Vite), opcional | Endpoint do `socket.io-client` (`src/features/realtime/client/socket.ts`). Default `/` (mesma origem). Mesma ressalva da variável anterior. |

Defina via `.env.local` (não versionado) para desenvolvimento:

```bash
echo "VITE_ENABLE_MOCKS=true" > .env.local
```

Para build de produção, a flag precisa estar presente no comando de build em
si (é lida em build-time, não em runtime — `vite preview` sozinho não
reativa os mocks de um build sem a flag):

```bash
VITE_ENABLE_MOCKS=true npm run build
```

O deploy na Vercel já define isso automaticamente via `buildCommand` em
`vercel.json`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção (`tsc -b && vite build`) |
| `npm run preview` | Serve o build de produção já gerado |
| `npm run typecheck` | `tsc -b`, sem emitir arquivos |
| `npm run lint` | `oxlint` |
| `npm run test:unit` | Testes unitários (Vitest) — lógica pura de negócio |
| `npm run test:e2e` | Testes E2E (Playwright), Chromium desktop + mobile |
| `npm run lighthouse` | Auditoria Lighthouse (ver seção própria, Fase 11) |

## Credenciais fictícias

Dois usuários fixture, sempre disponíveis com os mocks ativos:

| E-mail | Senha | Perfil |
| --- | --- | --- |
| `ana@example.com` | `Colecionar123!` | 2 carteiras, perfil com bio preenchida, carrinho pré-semeado |
| `bruno@example.com` | `Colecionar123!` | 1 carteira |

Senhas nunca são persistidas em claro — o backend simulado guarda só o hash
(`src/features/mocks/utils/password.ts`).

## Seleção e reset de cenários

A camada de mocks expõe um painel de controle fora do contrato REST do
produto, só para desenvolvimento/testes:

- **REST**: `POST /api/__mock__/scenario` (define latência, `networkDown`,
  `forceError`, `forceEmpty`, `sessionForceExpired`,
  `ordersCreateTimeoutOnce`, `paymentOutcome` — ver
  `src/features/mocks/scenario.ts` para o shape completo) e
  `POST /api/__mock__/reset` (restaura fixtures + cenário aos valores
  padrão).
- **No browser** (DevTools, com a app rodando e mocks ativos):
  `window.__mocks__.setScenario({ ... })`, `window.__mocks__.resetScenario()`.

Exemplos:

```js
// Forçar erro 503 na listagem de NFTs
await fetch('/api/__mock__/scenario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ forceError: { 'nfts.list': { status: 503, body: { code: 'TRANSIENT_ERROR', message: 'Falha simulada', retryable: true } } } }),
})

// Restaurar tudo
await fetch('/api/__mock__/reset', { method: 'POST' })
```

## Reproduzindo fluxos de falha

| Fluxo | Como reproduzir |
| --- | --- |
| Latência alta / timeout | `setScenario({ latencyMs: { minMs: 2000, maxMs: 5000 } })` |
| Indisponibilidade de rede | `setScenario({ networkDown: ['nfts.list'] })` (qualquer chave de endpoint) |
| Sessão expirada | `setScenario({ sessionForceExpired: true })` enquanto logado |
| Cupom inválido/expirado | Use os códigos fixture `NAOEXISTE` (404) e `EXPIRADO15` (409) no carrinho |
| Preço alterado durante checkout | `fetch('/api/__mock__/simulate/nft-update', { method: 'POST', body: JSON.stringify({ nftId, editionId, priceEth: '9.99' }) })` com o item já no carrinho |
| Timeout na criação do pedido | `setScenario({ ordersCreateTimeoutOnce: true })` antes de confirmar a compra |
| Pagamento recusado | `setScenario({ paymentOutcome: 'refused' })` antes de confirmar a compra |

Depois de qualquer cenário forçado, `resetScenario()` (ou
`POST /api/__mock__/reset`) restaura o estado padrão determinístico.

## Testes

- `npm run test:unit` — 85 testes (Vitest) cobrindo aritmética ETH, cotação,
  hash de senha, filtro/ordenação/paginação do catálogo, idempotência,
  proteção contra open-redirect.
- `npm run test:e2e` — suíte Playwright cobrindo os 12 cenários da seção 9
  do `DESAFIO.md` (busca/filtros/histórico, 404, auth completo, favoritos,
  carrinho, compra ponta a ponta, teclado/formulários, skeletons) +
  regressão visual (Início/Detalhe/Carrinho/Pagamento, desktop+mobile) com
  baselines versionadas em `tests/e2e/visual.spec.ts-snapshots/`. Relatório
  HTML em `playwright-report/`, traces de falha retidos automaticamente.

Ver `ARCHITECTURE.md` seção 16 para a tabela completa cenário → spec.

## Deploy

Hospedado na Vercel, conectado ao GitHub (deploy automático a cada push em
`master`). Configuração em `vercel.json`:

- `buildCommand`: injeta `VITE_ENABLE_MOCKS=true` (necessário — ver seção de
  variáveis de ambiente acima).
- `rewrites`: todo caminho reescreve para `/index.html`, necessário para
  acesso direto e refresh de qualquer rota do TanStack Router funcionarem no
  ambiente publicado (SPA sem servidor próprio).

## Documentação adicional

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — contratos REST/eventos, política de
  sessão, estado do carrinho, estratégia de cache, reconciliação
  REST↔Socket.IO, limitações e decisões de UX, registradas fase a fase.
- [`PLAN.md`](PLAN.md) — plano de fases e gates de validação usados para
  construir esta entrega.
- [`AGENTS.md`](AGENTS.md) — roster de agentes/skills usados no processo de
  desenvolvimento (não faz parte do produto entregue).
