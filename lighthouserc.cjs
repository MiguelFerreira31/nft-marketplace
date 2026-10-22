/**
 * Configuração do Lighthouse CI (seção 10 do readme.md).
 *
 * Nesta fase (0 — fundação) só existe a rota "/" com um placeholder; as
 * páginas reais a auditar ("Início" e "Detalhe do NFT") só existem a partir
 * das Fases 1 e 4. Por isso as assertions abaixo usam nível `warn`, não
 * `error` — o objetivo aqui é garantir que `npm run lighthouse` executa de
 * ponta a ponta (build otimizado → preview → 3 medições → relatório) a
 * partir de um checkout limpo. `agent-quality` (Fase 11, PLAN.md) deve:
 *
 * 1. Atualizar `collect.url` para as rotas reais de Início e Detalhe (hoje
 *    só "/" existe).
 * 2. Trocar os `assert` de `warn` para `error` nos 4 limites da seção 10
 *    (Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90).
 * 3. Versionar os relatórios HTML/JSON gerados em `.lighthouseci/` junto da
 *    justificativa de qualquer resultado abaixo da meta (LCP/CLS/TBT).
 */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173/'],
      startServerCommand: 'npm run preview -- --port 4173',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
