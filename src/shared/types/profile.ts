import type { IsoDateTime } from './common'
import type { UserId } from './session'

export interface Profile {
  id: UserId
  name: string
  email: string
  avatarUrl: string | null
  bio: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type ProfileResponse = Profile

export interface UpdateProfileRequest {
  name?: string
  email?: string
  bio?: string | null
}

export type UpdateProfileResponse = Profile

/**
 * Avatar é enviado como data URL (base64) na simulação — não há upload de
 * arquivo binário real (fora do escopo, seção 1: integrações reais com
 * backend ficam fora do desafio). `agent-account` decide o componente de
 * input; este contrato apenas fixa o formato do payload.
 */
export interface UpdateAvatarRequest {
  avatarDataUrl: string
}

export type UpdateAvatarResponse = Profile

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/** Sem corpo de resposta além do status de sucesso. */
export type ChangePasswordResponse = null
