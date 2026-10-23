import { describe, expect, it } from 'vitest'
import type { AxiosError } from 'axios'
import type { ApiErrorBody } from '@/shared/types'
import { mapAccountError, mapAuthError } from './form-errors'

/** Constrói um erro "parecido com Axios" o suficiente para `isApiError` (ver `shared/api/http.ts`) reconhecer. */
function fakeApiError(status: number, body: ApiErrorBody): AxiosError {
  return {
    isAxiosError: true,
    response: { status, data: { error: body }, statusText: '', headers: {}, config: {} as never },
    message: body.message,
    name: 'AxiosError',
    config: {} as never,
    toJSON: () => ({}),
  } as unknown as AxiosError
}

describe('mapAuthError', () => {
  it('reports a connection failure for a non-API error (no response at all)', () => {
    const result = mapAuthError(new Error('network down'))
    expect(result.fieldErrors).toEqual({})
    expect(result.formError).toMatch(/conectar ao servidor/)
  })

  it('maps VALIDATION_ERROR fieldErrors to the first message per field', () => {
    const error = fakeApiError(400, {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      fieldErrors: { email: ['Informe um e-mail válido.', 'segunda mensagem'], password: ['Informe sua senha.'] },
    })
    const result = mapAuthError(error)
    expect(result.fieldErrors).toEqual({ email: 'Informe um e-mail válido.', password: 'Informe sua senha.' })
    expect(result.formError).toBeNull()
  })

  it('falls back to the generic message when VALIDATION_ERROR has no field entries', () => {
    const error = fakeApiError(400, { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', fieldErrors: {} })
    const result = mapAuthError(error)
    expect(result.fieldErrors).toEqual({})
    expect(result.formError).toBe('Dados inválidos.')
  })

  it('maps a DUPLICATE_EMAIL conflict to the email field', () => {
    const error = fakeApiError(409, { code: 'CONFLICT', message: 'Este e-mail já está cadastrado.', reason: 'DUPLICATE_EMAIL' })
    const result = mapAuthError(error)
    expect(result.fieldErrors).toEqual({ email: 'Este e-mail já está cadastrado.' })
    expect(result.formError).toBeNull()
  })

  it('maps TRANSIENT_ERROR to a generic retry message, ignoring the server message', () => {
    const error = fakeApiError(503, { code: 'TRANSIENT_ERROR', message: 'Mensagem interna qualquer.', retryable: true })
    const result = mapAuthError(error)
    expect(result.formError).toBe('Falha temporária no servidor. Tente novamente em alguns segundos.')
  })

  it('falls back to the server message for any other error code', () => {
    const error = fakeApiError(403, { code: 'FORBIDDEN', message: 'Sem permissão.' })
    const result = mapAuthError(error)
    expect(result.formError).toBe('Sem permissão.')
  })
})

describe('mapAccountError', () => {
  it('surfaces the real TRANSIENT_ERROR server message instead of the generic one', () => {
    const error = fakeApiError(503, { code: 'TRANSIENT_ERROR', message: 'Falha temporária.', retryable: true })
    const result = mapAccountError(error)
    expect(result.formError).toBe('Falha temporária.')
  })

  it('behaves exactly like mapAuthError for non-transient errors', () => {
    const error = fakeApiError(400, {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      fieldErrors: { name: ['Informe um nome entre 2 e 60 caracteres.'] },
    })
    expect(mapAccountError(error)).toEqual(mapAuthError(error))
  })
})
