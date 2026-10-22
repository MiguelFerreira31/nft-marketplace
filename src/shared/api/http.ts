import axios, { type AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/shared/types'
import { isApiErrorResponse } from '@/shared/types'

/**
 * Único client Axios da aplicação. Toda chamada REST (catálogo, favoritos,
 * carrinho, cotação, pedidos, perfil, carteiras, sessão) passa por aqui —
 * nenhum outro módulo deve instanciar `axios` diretamente (seção 4 do
 * readme: "As chamadas REST devem passar pelo Axios.").
 *
 * `withCredentials: true` porque a sessão simulada (Fase 3) é baseada em
 * cookie httpOnly emitido pelo MSW, não em token manual no client.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** Alias de conveniência para tipar erros Axios com o envelope de erro da API. */
export type ApiError = AxiosError<ApiErrorResponse>

export function isApiError(error: unknown): error is ApiError {
  return axios.isAxiosError(error) && isApiErrorResponse(error.response?.data)
}

/**
 * Extrai o corpo de erro tipado (`ApiErrorBody`) de um erro Axios, quando
 * presente. Use isto nos `onError` de mutations para decidir mensagens de
 * campo (`VALIDATION_ERROR`), redirecionar para login (`INVALID_SESSION`),
 * etc. — nunca faça parsing manual de `error.message`.
 */
export function getApiErrorBody(error: unknown) {
  if (!isApiError(error) || !error.response) return null
  return error.response.data.error
}

/**
 * Interceptor central de resposta: hoje só garante que falhas de rede (sem
 * `error.response`, ex.: conexão indisponível simulada pelo MSW) continuem
 * rejeitando a Promise sem mascarar o erro. Tratamento de `INVALID_SESSION`
 * (redirecionar para login preservando o fluxo) é implementado pelo
 * `agent-auth` na Fase 3, reaproveitando `getApiErrorBody`/`isApiError`
 * acima — não há "any" nem lógica de negócio escondida aqui.
 */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(error),
)
