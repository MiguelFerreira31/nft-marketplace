/**
 * Wrapper de persistência local usado por TODO o estado do mock (banco de
 * dados simulado em `db/store.ts` e configuração de cenário em `scenario.ts`)
 * — seção 6 do readme: "Persistência local é permitida para sustentar
 * refresh".
 *
 * Usa `localStorage` quando disponível (browser real, dev/demo/Playwright em
 * browser). Cai para um `Map` em memória quando `localStorage` não existe
 * (ambiente Node puro, ex.: `msw/node` fora de um browser/jsdom) ou lança
 * (modo privado de alguns navegadores) — o processo simplesmente não
 * sobrevive a um restart nesse caso, o que é aceitável: Node não tem
 * "refresh de página" para sustentar.
 */
const STORAGE_PREFIX = 'nft-marketplace:mocks:'

const memoryFallback = new Map<string, string>()

function getBrowserStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') {
      // Sonda de escrita: alguns browsers expõem `localStorage` mas lançam ao
      // usar (modo privado estrito). Prefira o fallback em memória nesse caso.
      const probeKey = `${STORAGE_PREFIX}__probe__`
      localStorage.setItem(probeKey, '1')
      localStorage.removeItem(probeKey)
      return localStorage
    }
  } catch {
    // ignorado — cai para o fallback em memória abaixo.
  }
  return null
}

export function readPersisted<TValue>(key: string): TValue | null {
  const storage = getBrowserStorage()
  const raw = storage ? storage.getItem(STORAGE_PREFIX + key) : memoryFallback.get(STORAGE_PREFIX + key) ?? null
  if (raw == null) return null
  try {
    return JSON.parse(raw) as TValue
  } catch {
    return null
  }
}

export function writePersisted<TValue>(key: string, value: TValue): void {
  const raw = JSON.stringify(value)
  const storage = getBrowserStorage()
  if (storage) {
    storage.setItem(STORAGE_PREFIX + key, raw)
  } else {
    memoryFallback.set(STORAGE_PREFIX + key, raw)
  }
}

export function clearPersisted(key: string): void {
  const storage = getBrowserStorage()
  if (storage) {
    storage.removeItem(STORAGE_PREFIX + key)
  } else {
    memoryFallback.delete(STORAGE_PREFIX + key)
  }
}
