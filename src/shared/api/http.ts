import axios, { type AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/shared/types'
import { isApiErrorResponse } from '@/shared/types'
import { notifySessionExpired } from '@/shared/session/session-expiry'

/**
 * Timeout padrão (ms) de toda requisição. Sem isto, uma resposta que nunca
 * chega (conexão indisponível/timeout simulado pelo MSW, seção 6) deixaria a
 * Promise pendurada para sempre — não há nenhuma lógica de negócio aqui,
 * apenas uma configuração de transporte necessária para que os cenários de
 * timeout do mock (`features/mocks/scenario.ts#forceTimeout`,
 * `ordersCreateTimeoutOnce`) sejam observáveis pelo client (Axios rejeita
 * com `ECONNABORTED` quando excedido). Documentado em `ARCHITECTURE.md`.
 */
export const HTTP_CLIENT_TIMEOUT_MS = 10_000

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
  timeout: HTTP_CLIENT_TIMEOUT_MS,
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
 * Interceptor central de resposta. Dois efeitos, nenhum deles decide
 * NEGÓCIO (isso fica nos hooks/componentes que consomem o erro rejeitado):
 *
 * 1. Falhas de rede (sem `error.response`, ex.: conexão indisponível
 *    simulada pelo MSW) seguem rejeitando a Promise sem mascarar o erro.
 * 2. Qualquer resposta 401 `INVALID_SESSION` (de QUALQUER recurso
 *    autenticado — perfil, carteiras, carrinho, pedidos, não só
 *    `/session`) notifica `shared/session/session-expiry.ts`, que é quem
 *    decide limpar cache/subscriptions e redirecionar para `/login`
 *    preservando o destino (seção 3: "Trate expiração durante a navegação
 *    e durante o checkout, preservando o contexto para retomada"). A
 *    Promise original continua sendo rejeitada normalmente — quem chamou a
 *    mutation/query ainda recebe o erro para seu próprio tratamento local,
 *    se precisar.
 */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const body = getApiErrorBody(error)
    if (body?.code === 'INVALID_SESSION') {
      notifySessionExpired({ requestUrl: isApiError(error) ? error.config?.url : undefined })
    }
    return Promise.reject(error)
  },
)
