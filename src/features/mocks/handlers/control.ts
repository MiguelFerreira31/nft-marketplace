import { HttpResponse, http } from 'msw'
import type { EditionId, NftId, OrderId, OrderStatus } from '@/shared/types'
import { getDb, resetMockData } from '../db/store'
import { applyNftUpdate, forceOrderStatus } from '../realtime/mutations'
import { getScenario, resetScenario, setScenario, type MockScenarioConfig } from '../scenario'
import { notFoundError } from '../utils/http-error'

/**
 * Painel de controle do mock — NÃO faz parte dos 8 recursos da seção 5 do
 * readme (sessão, NFTs, favoritos, carrinho, cotação, pedidos, perfil,
 * carteiras). É usado só por testes/ferramentas (Playwright, devtools,
 * `window.__mocks__` em `browser.ts`) para selecionar/reproduzir os
 * cenários da seção 6 e para disparar os eventos do roteiro da seção 7 —
 * NENHUM código de produto (`features/*`, exceto `mocks`) chama isto.
 *
 * Documentado em `ARCHITECTURE.md` ("Seleção/reset de cenários").
 */
export const controlHandlers = [
  http.get('/api/__mock__/scenario', () => {
    return HttpResponse.json<MockScenarioConfig>(getScenario())
  }),

  http.post('/api/__mock__/scenario', async ({ request }) => {
    const patch = (await request.json()) as Partial<MockScenarioConfig>
    return HttpResponse.json<MockScenarioConfig>(setScenario(patch))
  }),

  http.post('/api/__mock__/scenario/reset', () => {
    return HttpResponse.json<MockScenarioConfig>(resetScenario())
  }),

  http.post('/api/__mock__/reset', async () => {
    await resetMockData()
    resetScenario()
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/__mock__/simulate/nft-update', async ({ request }) => {
    const body = (await request.json()) as { nftId: NftId; editionId?: EditionId; priceEth?: string; availableQuantity?: number }
    const db = await getDb()
    const nft = db.nfts.find((candidate) => candidate.id === body.nftId)
    if (!nft) return HttpResponse.json({ error: notFoundError('nft').body }, { status: 404 })
    if (body.editionId && !nft.editions.some((edition) => edition.id === body.editionId)) {
      return HttpResponse.json({ error: notFoundError('edition').body }, { status: 404 })
    }

    const envelope = applyNftUpdate(db, body.nftId, {
      editionId: body.editionId,
      priceEth: body.priceEth,
      availableQuantity: body.availableQuantity,
    })
    return HttpResponse.json(envelope)
  }),

  http.post('/api/__mock__/simulate/order-update', async ({ request }) => {
    const body = (await request.json()) as { orderId: OrderId; status: Extract<OrderStatus, 'confirmed' | 'refused'> }
    const db = await getDb()
    if (!db.orders[body.orderId]) return HttpResponse.json({ error: notFoundError('order').body }, { status: 404 })
    forceOrderStatus(db, body.orderId, body.status)
    return HttpResponse.json({ ok: true, order: db.orders[body.orderId].order })
  }),
]
