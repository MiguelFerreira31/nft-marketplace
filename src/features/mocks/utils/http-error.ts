import { HttpResponse } from 'msw'
import type {
  ApiErrorBody,
  ConflictErrorBody,
  InvalidSessionErrorBody,
  NotFoundErrorBody,
  PermissionErrorBody,
  TransientErrorBody,
  ValidationErrorBody,
} from '@/shared/types'

/**
 * Erro "de negócio simulado" lançado por qualquer handler de recurso
 * (`handlers/*.ts`) e convertido numa resposta HTTP com o envelope
 * `ApiErrorResponse` (único shape de erro — `shared/types/errors.ts`) pelo
 * wrapper `withScenario` (`scenario.ts`). Nenhuma camada fora do MSW lança
 * ou interpreta isto.
 */
export class ApiMockError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.body = body
  }
}

export function validationError(fieldErrors: Record<string, string[]>, message = 'Dados inválidos.'): ApiMockError {
  const body: ValidationErrorBody = { code: 'VALIDATION_ERROR', message, fieldErrors }
  return new ApiMockError(400, body)
}

export function invalidSessionError(reason: InvalidSessionErrorBody['reason'], message = 'Sessão inválida.'): ApiMockError {
  const body: InvalidSessionErrorBody = { code: 'INVALID_SESSION', message, reason }
  return new ApiMockError(401, body)
}

export function forbiddenError(message = 'Você não tem permissão para esta operação.'): ApiMockError {
  const body: PermissionErrorBody = { code: 'FORBIDDEN', message }
  return new ApiMockError(403, body)
}

export function notFoundError(resource: NotFoundErrorBody['resource'], message = 'Recurso não encontrado.'): ApiMockError {
  const body: NotFoundErrorBody = { code: 'NOT_FOUND', message, resource }
  return new ApiMockError(404, body)
}

export function conflictError(reason: ConflictErrorBody['reason'], message = 'Conflito ao processar a operação.'): ApiMockError {
  const body: ConflictErrorBody = { code: 'CONFLICT', message, reason }
  return new ApiMockError(409, body)
}

export function transientError(message = 'Falha transitória simulada — tente novamente.'): ApiMockError {
  const body: TransientErrorBody = { code: 'TRANSIENT_ERROR', message, retryable: true }
  return new ApiMockError(503, body)
}

/** Converte um `ApiMockError` (ou erro inesperado) numa `Response` MSW. */
export function toHttpResponse(error: unknown): Response {
  if (error instanceof ApiMockError) {
    return HttpResponse.json({ error: error.body }, { status: error.status })
  }
  // Erro de programação do próprio handler — não deveria acontecer, mas não
  // deixamos a Promise rejeitar sem resposta (o cliente ficaria pendurado).
  console.error('[mocks] erro inesperado em um handler MSW:', error)
  const body: TransientErrorBody = {
    code: 'TRANSIENT_ERROR',
    message: 'Erro inesperado no backend simulado.',
    retryable: true,
  }
  return HttpResponse.json({ error: body }, { status: 500 })
}
