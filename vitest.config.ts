import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Configuração de testes unitários (Vitest). Escopo deliberadamente restrito
 * a lógica de negócio pura (`src/features/mocks/utils/*`, mapeamento de
 * erro, idempotência, `safeRedirect`) — componentes React, hooks com
 * rede/DOM e os fluxos completos de tela já são cobertos pelos specs
 * Playwright em `tests/e2e` (ver `ARCHITECTURE.md`). Por isso roda em
 * ambiente `node` puro (sem jsdom): nenhum arquivo `*.test.ts` aqui importa
 * React.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    css: false,
    reporters: ['default'],
  },
})
