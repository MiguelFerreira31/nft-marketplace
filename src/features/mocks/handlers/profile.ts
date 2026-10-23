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
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_FILE_SIZE_BYTES,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
} from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import type { MockUserRecord } from '../db/types'
import { requireUser } from '../utils/auth'
import { conflictError, validationError } from '../utils/http-error'
import { hashPassword, verifyPassword } from '../utils/password'
import { withScenario } from '../utils/with-scenario'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AVATAR_DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/

function isValidAvatarDataUrl(value: string): boolean {
  const match = AVATAR_DATA_URL_PATTERN.exec(value)
  if (!match || !AVATAR_MIME_TYPES.includes(match[1] as (typeof AVATAR_MIME_TYPES)[number])) return false

  const base64 = match[2]
  if (base64.length % 4 !== 0) return false
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const sizeBytes = Math.floor((base64.length * 3) / 4) - padding
  return sizeBytes > 0 && sizeBytes <= MAX_AVATAR_FILE_SIZE_BYTES
}

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
      const email = body.email?.trim()
      if (body.name !== undefined && (body.name.trim().length < 2 || body.name.trim().length > PROFILE_NAME_MAX_LENGTH)) {
        fieldErrors.name = [`Informe um nome entre 2 e ${PROFILE_NAME_MAX_LENGTH} caracteres.`]
      }
      if (email !== undefined && !EMAIL_PATTERN.test(email)) {
        fieldErrors.email = ['Informe um e-mail válido.']
      }
      if (body.bio !== undefined && (body.bio?.length ?? 0) > PROFILE_BIO_MAX_LENGTH) {
        fieldErrors.bio = [`A biografia deve ter no máximo ${PROFILE_BIO_MAX_LENGTH} caracteres.`]
      }
      if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

      if (email && email.toLowerCase() !== user.email) {
        const taken = db.users.some((candidate) => candidate.id !== user.id && candidate.email.toLowerCase() === email.toLowerCase())
        if (taken) throw conflictError('DUPLICATE_EMAIL', 'Este e-mail já está em uso por outra conta.')
        user.email = email.toLowerCase()
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

      if (!body.avatarDataUrl || !isValidAvatarDataUrl(body.avatarDataUrl)) {
        throw validationError({
          avatarDataUrl: [`Envie PNG, JPEG, WebP ou GIF com até ${MAX_AVATAR_FILE_SIZE_BYTES / 1_048_576} MB.`],
        })
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
