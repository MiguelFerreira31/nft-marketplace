import { describe, expect, it } from 'vitest'
import {
  ApiMockError,
  conflictError,
  forbiddenError,
  invalidSessionError,
  notFoundError,
  toHttpResponse,
  transientError,
  validationError,
} from './http-error'

/**
 * Fábricas de erro (readme §5: "as respostas devem representar erros de
 * validação, sessão inválida, falta de permissão, recurso inexistente,
 * conflito de disponibilidade e falha transitória") + o conversor que
 * `withScenario` usa para transformar qualquer `ApiMockError` lançado por um
 * handler numa `Response` MSW real.
 */
describe('error factories', () => {
  it('validationError produces a 400 with fieldErrors', () => {
    const error = validationError({ email: ['Informe um e-mail válido.'] })
    expect(error.status).toBe(400)
    expect(error.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      fieldErrors: { email: ['Informe um e-mail válido.'] },
    })
  })

  it('invalidSessionError produces a 401 with the given reason', () => {
    const error = invalidSessionError('EXPIRED_SESSION')
    expect(error.status).toBe(401)
    expect(error.body).toMatchObject({ code: 'INVALID_SESSION', reason: 'EXPIRED_SESSION' })
  })

  it('forbiddenError produces a 403', () => {
    const error = forbiddenError()
    expect(error.status).toBe(403)
    expect(error.body.code).toBe('FORBIDDEN')
  })

  it('notFoundError produces a 404 with the resource kind', () => {
    const error = notFoundError('order')
    expect(error.status).toBe(404)
    expect(error.body).toMatchObject({ code: 'NOT_FOUND', resource: 'order' })
  })

  it('conflictError produces a 409 with the given reason', () => {
    const error = conflictError('IDEMPOTENCY_KEY_MISMATCH')
    expect(error.status).toBe(409)
    expect(error.body).toMatchObject({ code: 'CONFLICT', reason: 'IDEMPOTENCY_KEY_MISMATCH' })
  })

  it('transientError produces a retryable 503', () => {
    const error = transientError()
    expect(error.status).toBe(503)
    expect(error.body).toMatchObject({ code: 'TRANSIENT_ERROR', retryable: true })
  })

  it('every factory accepts a custom message', () => {
    const error = notFoundError('nft', 'Mensagem customizada.')
    expect(error.message).toBe('Mensagem customizada.')
    expect(error.body.message).toBe('Mensagem customizada.')
  })
})

describe('toHttpResponse', () => {
  it('converts an ApiMockError into a Response with the matching status and envelope', async () => {
    const response = toHttpResponse(conflictError('STOCK_UNAVAILABLE', 'Sem estoque suficiente.'))
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body).toEqual({ error: { code: 'CONFLICT', message: 'Sem estoque suficiente.', reason: 'STOCK_UNAVAILABLE' } })
  })

  it('falls back to a 500 TRANSIENT_ERROR envelope for an unexpected (programming) error', async () => {
    const response = toHttpResponse(new Error('boom'))
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: { code: string; retryable: boolean } }
    expect(body.error.code).toBe('TRANSIENT_ERROR')
    expect(body.error.retryable).toBe(true)
  })

  it('instances are real ApiMockError errors usable with instanceof', () => {
    expect(transientError()).toBeInstanceOf(ApiMockError)
    expect(transientError()).toBeInstanceOf(Error)
  })
})
