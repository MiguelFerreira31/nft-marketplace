/**
 * Formatos de erro compartilhados por todos os contratos REST (seção 5 do
 * readme.md: "As respostas devem representar erros de validação, sessão
 * inválida, falta de permissão, recurso inexistente, conflito de
 * disponibilidade e falha transitória.").
 *
 * Toda resposta de erro HTTP do backend simulado (MSW) usa o envelope
 * `ApiErrorResponse` abaixo. O client Axios (`src/shared/api/http.ts`) nunca
 * inventa um shape de erro alternativo — ele apenas repassa/normaliza este
 * envelope para quem consome (TanStack Query / UI).
 */

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_SESSION'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TRANSIENT_ERROR'

interface ApiErrorBase {
  code: ApiErrorCode
  message: string
  /** Identificador de correlação para depuração/log, opcional. */
  requestId?: string
}

/** 400 — erro de validação de formulário/payload. */
export interface ValidationErrorBody extends ApiErrorBase {
  code: 'VALIDATION_ERROR'
  /** Mapa campo → lista de mensagens, para associar erro a input na UI. */
  fieldErrors: Record<string, string[]>
}

/** 401 — sessão ausente, expirada ou inválida. */
export interface InvalidSessionErrorBody extends ApiErrorBase {
  code: 'INVALID_SESSION'
  reason: 'MISSING_SESSION' | 'EXPIRED_SESSION' | 'REVOKED_SESSION'
}

/** 403 — usuário autenticado sem permissão para a operação/recurso. */
export interface PermissionErrorBody extends ApiErrorBase {
  code: 'FORBIDDEN'
}

/** 404 — recurso inexistente (NFT, edição, pedido, carteira, etc.). */
export interface NotFoundErrorBody extends ApiErrorBase {
  code: 'NOT_FOUND'
  resource: 'nft' | 'edition' | 'cart_item' | 'order' | 'wallet' | 'profile' | 'coupon'
}

/**
 * 409 — conflito de disponibilidade ou de estado:
 * - cadastro com e-mail já existente;
 * - edição sem estoque suficiente no momento da confirmação;
 * - reutilização de `Idempotency-Key` com payload diferente do original.
 */
export interface ConflictErrorBody extends ApiErrorBase {
  code: 'CONFLICT'
  reason: 'DUPLICATE_EMAIL' | 'STOCK_UNAVAILABLE' | 'COUPON_UNAVAILABLE' | 'IDEMPOTENCY_KEY_MISMATCH'
}

/** 502/503/504 ou falha de rede simulada — seguro reexecutar a operação. */
export interface TransientErrorBody extends ApiErrorBase {
  code: 'TRANSIENT_ERROR'
  retryable: true
}

export type ApiErrorBody =
  | ValidationErrorBody
  | InvalidSessionErrorBody
  | PermissionErrorBody
  | NotFoundErrorBody
  | ConflictErrorBody
  | TransientErrorBody

/** Shape literal do corpo JSON de qualquer resposta de erro da API. */
export interface ApiErrorResponse {
  error: ApiErrorBody
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { error?: unknown }
  return typeof candidate.error === 'object' && candidate.error !== null && 'code' in candidate.error
}

export function isApiErrorCode<TCode extends ApiErrorCode>(
  body: ApiErrorBody,
  code: TCode,
): body is Extract<ApiErrorBody, { code: TCode }> {
  return body.code === code
}
