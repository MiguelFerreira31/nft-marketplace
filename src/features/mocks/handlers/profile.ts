import { HttpResponse, http } from 'msw'
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ProfileResponse,
  UpdateAvatarRequest,
  UpdateAvatarResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import type { MockUserRecord } from '../db/types'
import { requireUser } from '../utils/auth'
import { conflictError, validationError } from '../utils/http-error'
import { hashPassword, verifyPassword } from '../utils/password'
import { withScenario } from '../utils/with-scenario'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toProfile(user: MockUserRecord): ProfileResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export const profileHandlers = [
  http.get(
    '/api/profile',
    withScenario('profile.get', async () => {
      const db = await getDb()
      const user = requireUser(db)
      return HttpResponse.json<ProfileResponse>(toProfile(user))
    }),
  ),

  http.patch(
    '/api/profile',
    withScenario('profile.update', async ({ request }) => {
      const db = await getDb()
      const user = requireUser(db)
      const body = (await request.json()) as UpdateProfileRequest

      const fieldErrors: Record<string, string[]> = {}
      if (body.name !== undefined && body.name.trim().length < 2) {
        fieldErrors.name = ['Informe um nome com ao menos 2 caracteres.']
      }
      if (body.email !== undefined && !EMAIL_PATTERN.test(body.email)) {
        fieldErrors.email = ['Informe um e-mail válido.']
      }
      if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

      if (body.email && body.email.toLowerCase() !== user.email) {
        const taken = db.users.some((candidate) => candidate.id !== user.id && candidate.email.toLowerCase() === body.email!.toLowerCase())
        if (taken) throw conflictError('DUPLICATE_EMAIL', 'Este e-mail já está em uso por outra conta.')
        user.email = body.email.toLowerCase()
      }
      if (body.name !== undefined) user.name = body.name.trim()
      if (body.bio !== undefined) user.bio = body.bio

      user.updatedAt = new Date().toISOString()
      persistDb(db)

      const response: UpdateProfileResponse = toProfile(user)
      return HttpResponse.json(response)
    }),
  ),

  http.patch(
    '/api/profile/avatar',
    withScenario('profile.updateAvatar', async ({ request }) => {
      const db = await getDb()
      const user = requireUser(db)
      const body = (await request.json()) as UpdateAvatarRequest

      if (!body.avatarDataUrl || !body.avatarDataUrl.startsWith('data:image/')) {
        throw validationError({ avatarDataUrl: ['Envie uma imagem válida.'] })
      }

      user.avatarUrl = body.avatarDataUrl
      user.updatedAt = new Date().toISOString()
      persistDb(db)

      const response: UpdateAvatarResponse = toProfile(user)
      return HttpResponse.json(response)
    }),
  ),

  http.post(
    '/api/profile/password',
    withScenario('profile.changePassword', async ({ request }) => {
      const db = await getDb()
      const user = requireUser(db)
      const body = (await request.json()) as ChangePasswordRequest

      if (!body.newPassword || body.newPassword.length < 8) {
        throw validationError({ newPassword: ['A nova senha deve ter ao menos 8 caracteres.'] })
      }
      const currentOk = await verifyPassword(body.currentPassword ?? '', user.passwordHash)
      if (!currentOk) {
        throw validationError({ currentPassword: ['Senha atual incorreta.'] })
      }

      user.passwordHash = await hashPassword(body.newPassword)
      user.updatedAt = new Date().toISOString()
      persistDb(db)

      const response: ChangePasswordResponse = null
      return HttpResponse.json(response)
    }),
  ),
]
