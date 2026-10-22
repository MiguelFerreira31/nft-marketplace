import type { Brand, IsoDateTime } from './common'

export type UserId = Brand<string, 'UserId'>

export interface AuthUser {
  id: UserId
  name: string
  email: string
  avatarUrl: string | null
  createdAt: IsoDateTime
}

/** Sessão autenticada atual. `expiresAt` permite tratar expiração proativamente na UI. */
export interface Session {
  user: AuthUser
  expiresAt: IsoDateTime
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export type RegisterResponse = Session

export interface LoginRequest {
  email: string
  password: string
}

export type LoginResponse = Session

/** GET /session — `null` quando não há sessão ativa (visitante). */
export type SessionResponse = Session | null

export type LogoutResponse = null
