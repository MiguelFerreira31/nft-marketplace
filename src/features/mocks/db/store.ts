import { clearPersisted, readPersisted, writePersisted } from '../utils/storage'
import { createSeedDb, SCHEMA_VERSION } from './seed'
import type { MockDb } from './types'

const DB_KEY = 'db'

let dbPromise: Promise<MockDb> | null = null

async function loadOrSeed(): Promise<MockDb> {
  const persisted = readPersisted<MockDb>(DB_KEY)
  if (persisted && persisted.schemaVersion === SCHEMA_VERSION) {
    return persisted
  }
  const fresh = await createSeedDb()
  writePersisted(DB_KEY, fresh)
  return fresh
}

/**
 * Acesso único ao banco simulado. Handlers fazem
 * `const db = await getDb(); <mutações em memória>; persistDb(db)`.
 * `dbPromise` é um singleton por processo (aba do browser ou processo
 * Node) — não há concorrência real entre handlers (MSW resolve uma
 * requisição por vez, de forma assíncrona cooperativa), então mutar o
 * objeto em memória diretamente é seguro.
 */
export async function getDb(): Promise<MockDb> {
  if (!dbPromise) {
    dbPromise = loadOrSeed()
  }
  return dbPromise
}

/** Persiste o estado atual do db (seção 6: "persistência local para sustentar refresh"). */
export function persistDb(db: MockDb): void {
  writePersisted(DB_KEY, db)
}

/**
 * Reset de cenário (seção 6: "o reset deve restaurar integralmente um
 * cenário conhecido"). Descarta QUALQUER estado criado durante a sessão de
 * testes (pedidos, cupons aplicados, favoritos, carrinho, carteiras, preços
 * alterados via `nft.updated`) e volta exatamente para as fixtures.
 */
export async function resetMockData(): Promise<MockDb> {
  clearPersisted(DB_KEY)
  const fresh = await createSeedDb()
  writePersisted(DB_KEY, fresh)
  dbPromise = Promise.resolve(fresh)
  return fresh
}
