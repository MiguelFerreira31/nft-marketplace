import { getScenario } from '../scenario'
import { persistDb } from '../db/store'
import type { MockDb, MockUserRecord } from '../db/types'
import { invalidSessionError } from './http-error'

/**
 * Sessão simulada hoje = um PONTEIRO único no `MockDb` (`db.session`), não um
 * cookie real por aba/usuário (ver `ARCHITECTURE.md`, seção "Mocking — Fase
 * 2", subseção "Sessão simulada"). É suficiente para os 8 recursos da seção
 * 5 responderem de forma consistente e para os guards de rota (Fase 1)
 * funcionarem; `agent-auth` (Fase 3) decide se evolui isso para cookie
 * httpOnly real — o contrato (`SessionResponse`, `LoginResponse`, etc.) não
 * muda.
 */
export function currentUser(db: MockDb): MockUserRecord | null {
  const scenario = getScenario()
  if (scenario.sessionForceExpired) return null
  if (!db.session) return null
  if (new Date(db.session.expiresAt).getTime() <= Date.now()) {
    db.session = null
    persistDb(db)
    return null
  }
  return db.users.find((user) => user.id === db.session?.userId) ?? null
}

/** Lança 401 (`MISSING_SESSION`/`EXPIRED_SESSION`) quando não há usuário autenticado válido. */
export function requireUser(db: MockDb): MockUserRecord {
  const scenario = getScenario()
  if (scenario.sessionForceExpired && db.session) {
    throw invalidSessionError('EXPIRED_SESSION', 'Sessão expirada — faça login novamente.')
  }
  const user = currentUser(db)
  if (!user) {
    throw invalidSessionError(db.session ? 'EXPIRED_SESSION' : 'MISSING_SESSION', 'É necessário estar autenticado para esta operação.')
  }
  return user
}
