import { HttpResponse, http } from 'msw'
import type {
  AuthUser,
  CartItemId,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  Session,
  SessionResponse,
  UserId,
} from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import type { MockDb, MockUserRecord } from '../db/types'
import { currentUser } from '../utils/auth'
import { conflictError, validationError } from '../utils/http-error'
import { createMockId } from '../utils/ids'
import { hashPassword, verifyPassword } from '../utils/password'
import { withScenario } from '../utils/with-scenario'

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000

function toAuthUser(user: MockUserRecord): AuthUser {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt }
}

function toSession(user: MockUserRecord, expiresAt: string): Session {
  return { user: toAuthUser(user), expiresAt }
}

/**
 * Mescla o carrinho de visitante (`db.guestCart`) no carrinho do usuário que
 * acabou de autenticar (seção 3: "preservar os itens do visitante ao
 * autenticar"). Itens cuja edição já exista no carrinho do usuário somam
 * quantidades por completo — sem limitar ao estoque atual, para nunca
 * descartar quantidade em silêncio; se a soma exceder `availableQuantity`,
 * a UI do carrinho sinaliza o excesso e bloqueia o checkout até o usuário
 * ajustar (ver `ARCHITECTURE.md` §11). Os demais itens são adicionados sem
 * alteração. O carrinho de visitante é esvaziado ao final. Usado tanto por
 * login quanto por cadastro (um cadastro bem-sucedido também autentica —
 * ver `RegisterResponse = Session`).
 */
function mergeGuestCartInto(db: MockDb, user: MockUserRecord): void {
  if (db.guestCart.items.length === 0) return

  for (const guestItem of db.guestCart.items) {
    const existing = user.cart.items.find((item) => item.editionId === guestItem.editionId)
    if (existing) {
      existing.quantity += guestItem.quantity
    } else {
      user.cart.items.push({ ...guestItem, id: createMockId('cart-item') as CartItemId })
    }
  }
  const now = new Date().toISOString()
  user.cart.updatedAt = now
  db.guestCart = { id: 'guest', items: [], couponCode: null, updatedAt: now }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const sessionHandlers = [
  http.post(
    '/api/auth/register',
    withScenario('session.register', async ({ request }) => {
      const body = (await request.json()) as RegisterRequest
      const fieldErrors: Record<string, string[]> = {}
      if (!body.name || body.name.trim().length < 2) fieldErrors.name = ['Informe um nome com ao menos 2 caracteres.']
      if (!body.email || !EMAIL_PATTERN.test(body.email)) fieldErrors.email = ['Informe um e-mail válido.']
      if (!body.password || body.password.length < 8) fieldErrors.password = ['A senha deve ter ao menos 8 caracteres.']
      if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

      const db = await getDb()
      const emailTaken = db.users.some((user) => user.email.toLowerCase() === body.email.toLowerCase())
      if (emailTaken) throw conflictError('DUPLICATE_EMAIL', 'Este e-mail já está cadastrado.')

      const now = new Date().toISOString()
      const newUser: MockUserRecord = {
        id: createMockId('user') as UserId,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        passwordHash: await hashPassword(body.password),
        avatarUrl: null,
        bio: null,
        createdAt: now,
        updatedAt: now,
        favorites: {},
        wallets: [],
        cart: { id: createMockId('cart'), items: [], couponCode: null, updatedAt: now },
      }
      db.users.push(newUser)
      mergeGuestCartInto(db, newUser)

      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
      db.session = { userId: newUser.id, token: createMockId('session'), expiresAt }
      persistDb(db)

      const response: RegisterResponse = toSession(newUser, expiresAt)
      return HttpResponse.json(response, { status: 201 })
    }),
  ),

  http.post(
    '/api/auth/login',
    withScenario('session.login', async ({ request }) => {
      const body = (await request.json()) as LoginRequest
      const db = await getDb()
      const user = db.users.find((candidate) => candidate.email.toLowerCase() === body.email?.toLowerCase())
      const passwordOk = user ? await verifyPassword(body.password ?? '', user.passwordHash) : false

      if (!user || !passwordOk) {
        throw validationError(
          { email: ['E-mail ou senha incorretos.'], password: ['E-mail ou senha incorretos.'] },
          'Não foi possível entrar com essas credenciais.',
        )
      }

      mergeGuestCartInto(db, user)

      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
      db.session = { userId: user.id, token: createMockId('session'), expiresAt }
      persistDb(db)

      const response: LoginResponse = toSession(user, expiresAt)
      return HttpResponse.json(response)
    }),
  ),

  http.get(
    '/api/session',
    withScenario('session.get', async () => {
      const db = await getDb()
      const user = currentUser(db)
      const response: SessionResponse = user && db.session ? toSession(user, db.session.expiresAt) : null
      return HttpResponse.json(response)
    }),
  ),

  http.post(
    '/api/auth/logout',
    withScenario('session.logout', async () => {
      const db = await getDb()
      db.session = null
      persistDb(db)
      const response: LogoutResponse = null
      return HttpResponse.json(response)
    }),
  ),
]
