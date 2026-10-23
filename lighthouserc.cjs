/**
 * Configuração do Lighthouse CI (seção 10 do DESAFIO.md, Fase 11).
 *
 * Audita Início ("/") e Detalhe do NFT ("/nfts/nft-music-1"), build
 * otimizado + cenário padrão dos mocks (VITE_ENABLE_MOCKS=true), 3 medições
 * por página. Perfil mobile é o preset default do Lighthouse CLI; o perfil
 * desktop é rodado separadamente via
 * `npx lhci autorun --collect.settings.preset=desktop` (ver ARCHITECTURE.md
 * seção 17 para os dois conjuntos de resultados e a justificativa de
 * qualquer métrica abaixo da meta).
 */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173/', 'http://localhost:4173/nfts/nft-music-1'],
      startServerCommand: 'npm run preview -- --port 4173',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
