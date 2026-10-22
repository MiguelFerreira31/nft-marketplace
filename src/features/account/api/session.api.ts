import { http } from '@/shared/api/http'
import type { LoginRequest, LoginResponse, LogoutResponse, RegisterRequest, RegisterResponse, SessionResponse } from '@/shared/types'

export const sessionApi = {
  register(payload: RegisterRequest) {
    return http.post<RegisterResponse>('/auth/register', payload).then((response) => response.data)
  },

  login(payload: LoginRequest) {
    return http.post<LoginResponse>('/auth/login', payload).then((response) => response.data)
  },

  current(signal?: AbortSignal) {
    return http.get<SessionResponse>('/session', { signal }).then((response) => response.data)
  },

  logout() {
    return http.post<LogoutResponse>('/auth/logout').then((response) => response.data)
  },
}
