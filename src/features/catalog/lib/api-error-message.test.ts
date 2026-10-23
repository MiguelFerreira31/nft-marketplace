import { describe, expect, it } from 'vitest'
import type { AxiosError } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/shared/types'
import { describeQueryError } from './api-error-message'

/** Mesmo helper de `features/account/lib/form-errors.test.ts` — erro "parecido com Axios" o suficiente para `isApiError`. */
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

describe('describeQueryError', () => {
  it('reports a connection failure for a non-API error', () => {
    expect(describeQueryError(new Error('network down'))).toMatch(/conexão/)
  })

  it('maps TRANSIENT_ERROR to a retry message', () => {
    const error = fakeApiError(503, { code: 'TRANSIENT_ERROR', message: 'Mensagem interna.', retryable: true })
    expect(describeQueryError(error)).toBe('Falha temporária no servidor. Tente novamente em alguns segundos.')
  })

  it('maps NOT_FOUND to a generic not-found message', () => {
    const error = fakeApiError(404, { code: 'NOT_FOUND', message: 'Mensagem interna.', resource: 'nft' })
    expect(describeQueryError(error)).toBe('Recurso não encontrado.')
  })

  it('maps INVALID_SESSION to a session-expired message', () => {
    const error = fakeApiError(401, { code: 'INVALID_SESSION', message: 'Mensagem interna.', reason: 'EXPIRED_SESSION' })
    expect(describeQueryError(error)).toBe('Sua sessão expirou. Entre novamente para continuar.')
  })

  it('maps a STOCK_UNAVAILABLE conflict to a dedicated message', () => {
    const error = fakeApiError(409, { code: 'CONFLICT', message: 'Mensagem interna.', reason: 'STOCK_UNAVAILABLE' })
    expect(describeQueryError(error)).toBe('A disponibilidade dessa edição mudou. Atualizando os dados…')
  })

  it('falls back to the server message for a non-stock conflict', () => {
    const error = fakeApiError(409, { code: 'CONFLICT', message: 'Cupom esgotado.', reason: 'COUPON_UNAVAILABLE' })
    expect(describeQueryError(error)).toBe('Cupom esgotado.')
  })

  it('falls back to the server message for any other known code', () => {
    const error = fakeApiError(403, { code: 'FORBIDDEN', message: 'Sem permissão.' })
    expect(describeQueryError(error)).toBe('Sem permissão.')
  })

  it('falls back to a generic message when the code is unrecognized', () => {
    const error = fakeApiError(418, { code: 'SOMETHING_NEW' as ApiErrorCode, message: '' } as ApiErrorBody)
    expect(describeQueryError(error)).toBe('Ocorreu um erro inesperado. Tente novamente.')
  })
})
