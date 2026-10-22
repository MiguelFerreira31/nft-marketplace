import type { ApiErrorBody } from '@/shared/types'
import { readPersisted, writePersisted } from './utils/storage'

/**
 * Chave lógica de cada operação REST exposta pelos handlers (seção 5 do
 * readme) — usada para configurar cenários de rede/falha POR ENDPOINT
 * (seção 6). Não é parte do contrato público; é só o vocabulário do painel
 * de controle do mock.
 */
export type MockEndpointKey =
  | 'session.get'
  | 'session.register'
  | 'session.login'
  | 'session.logout'
  | 'nfts.list'
  | 'nfts.detail'
  | 'favorites.list'
  | 'favorites.add'
  | 'favorites.remove'
  | 'cart.get'
  | 'cart.addItem'
  | 'cart.updateItem'
  | 'cart.removeItem'
  | 'quote.get'
  | 'quote.applyCoupon'
  | 'quote.removeCoupon'
  | 'orders.create'
  | 'orders.get'
  | 'profile.get'
  | 'profile.update'
  | 'profile.updateAvatar'
  | 'profile.changePassword'
  | 'wallets.list'
  | 'wallets.upsert'

export interface LatencyRange {
  minMs: number
  maxMs: number
}

export interface ForcedError {
  status: number
  body: ApiErrorBody
}

export type PaymentOutcome = 'confirmed' | 'refused' | 'pending-forever'

/**
 * Configuração de cenário (seção 6 do readme). Tudo aqui é serializável,
 * persistido (`localStorage`) e documentado em `ARCHITECTURE.md` — é o único
 * mecanismo de ativar/combinar os cenários determinísticos exigidos:
 * sucesso/vazio, latência variável, timeouts, indisponibilidade de conexão,
 * HTTP 4xx/5xx, sessão expirada, pagamento confirmado/recusado etc.
 */
export interface MockScenarioConfig {
  /** Latência padrão (ms) aplicada a toda resposta de sucesso — variável dentro do range a cada chamada. */
  latencyMs: LatencyRange
  /** Overrides de latência por endpoint (sobrepõe `latencyMs` só para aquela chave). */
  latencyOverridesMs: Partial<Record<MockEndpointKey, LatencyRange>>
  /** Endpoints que devem responder com erro de rede (`HttpResponse.error()`) — "indisponibilidade de conexão". */
  networkDown: MockEndpointKey[]
  /** Endpoints que devem atrasar a resposta além do timeout do client Axios — "timeout". */
  forceTimeout: MockEndpointKey[]
  /** Força um status/erro específico num endpoint, ignorando a lógica normal — "HTTP 4xx/5xx" arbitrário. */
  forceError: Partial<Record<MockEndpointKey, ForcedError>>
  /** Endpoints de listagem que devem responder com o "vazio" determinístico (ex.: `nfts.list` sem itens). */
  forceEmpty: MockEndpointKey[]
  /**
   * Cenário dedicado (seção 6): "timeout após criação do pedido, com
   * recuperação por idempotência". Quando `true`, a 1ª chamada de
   * `POST /orders` para uma `Idempotency-Key` NOVA cria o pedido
   * normalmente no backend simulado, mas atrasa a resposta além do timeout
   * do client; o reenvio automático/controlado com a MESMA chave responde
   * imediatamente com o pedido já criado (sem recriar nada).
   */
  ordersCreateTimeoutOnce: boolean
  /** Resultado do "pagamento" simulado após a criação de um pedido `pending`. */
  paymentOutcome: PaymentOutcome
  /** Atraso (ms) até resolver `pending` → `confirmed`/`refused`, quando `paymentOutcome !== 'pending-forever'`. */
  paymentResolutionDelayMs: number
  /** Força qualquer endpoint autenticado a responder 401 `EXPIRED_SESSION`, mesmo com uma sessão válida guardada — "sessão expirada". */
  sessionForceExpired: boolean
}

export function defaultScenarioConfig(): MockScenarioConfig {
  return {
    latencyMs: { minMs: 150, maxMs: 500 },
    latencyOverridesMs: {},
    networkDown: [],
    forceTimeout: [],
    forceError: {},
    forceEmpty: [],
    ordersCreateTimeoutOnce: false,
    paymentOutcome: 'confirmed',
    paymentResolutionDelayMs: 2000,
    sessionForceExpired: false,
  }
}

const SCENARIO_KEY = 'scenario'

let current: MockScenarioConfig | null = null

function load(): MockScenarioConfig {
  if (current) return current
  const persisted = readPersisted<MockScenarioConfig>(SCENARIO_KEY)
  current = persisted ? { ...defaultScenarioConfig(), ...persisted } : defaultScenarioConfig()
  return current
}

function save(): void {
  if (current) writePersisted(SCENARIO_KEY, current)
}

export function getScenario(): MockScenarioConfig {
  return load()
}

/** Faz merge raso do patch sobre a config atual (arrays/objetos são SUBSTITUÍDOS, não mesclados). */
export function setScenario(patch: Partial<MockScenarioConfig>): MockScenarioConfig {
  current = { ...load(), ...patch }
  save()
  return current
}

export function resetScenario(): MockScenarioConfig {
  current = defaultScenarioConfig()
  save()
  return current
}

export function latencyFor(endpoint: MockEndpointKey): LatencyRange {
  const scenario = load()
  return scenario.latencyOverridesMs[endpoint] ?? scenario.latencyMs
}

export function randomLatencyMs(range: LatencyRange): number {
  if (range.maxMs <= range.minMs) return Math.max(0, range.minMs)
  return range.minMs + Math.floor(Math.random() * (range.maxMs - range.minMs))
}
