import { http } from '@/shared/api/http'
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ProfileResponse,
  UpdateAvatarRequest,
  UpdateAvatarResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from '@/shared/types'

export const profileApi = {
  get(signal?: AbortSignal) {
    return http.get<ProfileResponse>('/profile', { signal }).then((response) => response.data)
  },

  update(payload: UpdateProfileRequest) {
    return http.patch<UpdateProfileResponse>('/profile', payload).then((response) => response.data)
  },

  updateAvatar(payload: UpdateAvatarRequest) {
    return http.patch<UpdateAvatarResponse>('/profile/avatar', payload).then((response) => response.data)
  },

  changePassword(payload: ChangePasswordRequest) {
    return http.post<ChangePasswordResponse>('/profile/password', payload).then((response) => response.data)
  },
}
