import { setupWorker } from 'msw/browser'
import { getDb, resetMockData } from './db/store'
import { handlers } from './handlers'
import { applyNftUpdate, forceOrderStatus } from './realtime/mutations'
import { connectedClientCount, disconnectConnectedClients, emitNftUpdated, emitOrderUpdated } from './realtime/events'
import type { MockScenarioConfig } from './scenario'
import { getScenario, resetScenario, setScenario } from './scenario'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/shared/types'

/**
 * Worker MSW para o browser (dev/demo/Playwright). Ativado por
 * configuração via `VITE_ENABLE_MOCKS` (seção 6: "ativada por configuração
 * e estar disponível no build de demonstração") — ver chamada condicional
 * em `src/main.tsx`, que importa este módulo e chama `worker.start()`.
 *
 * O binding Socket.IO (`@mswjs/socket.io-binding`) está entre os `handlers`
 * (ver `handlers/index.ts` + `realtime/events.ts`, que documenta o desvio
 * necessário no padrão de URL usado por `ws.link()`).
 */
export const worker = setupWorker(...handlers)

/**
 * Painel de controle exposto em `window.__mocks__` — usado por testes
 * Playwright (`page.evaluate(() => window.__mocks__.resetAll())`) e por
 * quem for depurar manualmente no DevTools. Equivalente, em código, aos
 * endpoints REST de `handlers/control.ts` (`/api/__mock__/*`) — ambos os
 * caminhos existem porque alguns consumidores preferem chamadas HTTP
 * (`page.request.post`) e outros preferem `page.evaluate` direto. Nenhum
 * código de produto (`features/*`, fora de `mocks`) lê este global.
 */
export interface MockControlPanel {
  resetAll: () => Promise<void>
  getScenario: () => MockScenarioConfig
  setScenario: (patch: Partial<MockScenarioConfig>) => MockScenarioConfig
  resetScenario: () => MockScenarioConfig
  simulateNftUpdate: (input: { nftId: string; editionId?: string; priceEth?: string; availableQuantity?: number }) => Promise<unknown>
  simulateOrderUpdate: (input: { orderId: string; status: 'confirmed' | 'refused' }) => Promise<unknown>
  replayNftEvent: (event: NftUpdatedEvent) => void
  replayOrderEvent: (event: OrderUpdatedEvent) => void
  connectedSocketCount: () => number
  disconnectSocketClients: () => void
}

declare global {
  interface Window {
    __mocks__?: MockControlPanel
  }
}

if (typeof window !== 'undefined') {
  window.__mocks__ = {
    async resetAll() {
      await resetMockData()
      resetScenario()
    },
    getScenario,
    setScenario,
    resetScenario,
    async simulateNftUpdate(input) {
      const db = await getDb()
      return applyNftUpdate(db, input.nftId as never, {
        editionId: input.editionId as never,
        priceEth: input.priceEth,
        availableQuantity: input.availableQuantity,
      })
    },
    async simulateOrderUpdate(input) {
      const db = await getDb()
      return forceOrderStatus(db, input.orderId as never, input.status)
    },
    replayNftEvent(event) {
      emitNftUpdated(event)
    },
    replayOrderEvent(event) {
      emitOrderUpdated(event)
    },
    connectedSocketCount() {
      return connectedClientCount()
    },
    disconnectSocketClients() {
      disconnectConnectedClients()
    },
  }
}
