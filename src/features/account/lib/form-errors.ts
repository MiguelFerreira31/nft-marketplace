import { getApiErrorBody, isApiError } from '@/shared/api/http'
import { isApiErrorCode } from '@/shared/types'

/**
 * Traduz um erro Axios de um `onError` de mutation (login/cadastro) para:
 * - `fieldErrors`: mapa campo → primeira mensagem, para associar a cada
 *   `<input>` (400 `VALIDATION_ERROR`; também usado para o 409
 *   `DUPLICATE_EMAIL` do cadastro, reaproveitando o campo `email`).
 * - `formError`: mensagem genérica quando o erro não é de um campo
 *   específico (conflito sem campo associado, falha transitória, sessão).
 *
 * Mantém toda a interpretação do envelope de erro (`shared/types/errors.ts`)
 * num único lugar reaproveitado por `login.tsx`/`register.tsx` — nenhum dos
 * dois formulários faz parsing manual de `error.response`.
 */
export interface AuthFormErrors {
  fieldErrors: Record<string, string>
  formError: string | null
}

export function mapAuthError(error: unknown): AuthFormErrors {
  if (!isApiError(error)) {
    return { fieldErrors: {}, formError: 'Não foi possível conectar ao servidor. Tente novamente.' }
  }

  const body = getApiErrorBody(error)
  if (!body) {
    return { fieldErrors: {}, formError: 'Ocorreu um erro inesperado. Tente novamente.' }
  }

  if (isApiErrorCode(body, 'VALIDATION_ERROR')) {
    const fieldErrors: Record<string, string> = {}
    for (const [field, messages] of Object.entries(body.fieldErrors)) {
      if (messages[0]) fieldErrors[field] = messages[0]
    }
    return { fieldErrors, formError: Object.keys(fieldErrors).length > 0 ? null : body.message }
  }

  if (isApiErrorCode(body, 'CONFLICT') && body.reason === 'DUPLICATE_EMAIL') {
    return { fieldErrors: { email: body.message || 'Este e-mail já está cadastrado.' }, formError: null }
  }

  if (isApiErrorCode(body, 'TRANSIENT_ERROR')) {
    return { fieldErrors: {}, formError: 'Falha temporária no servidor. Tente novamente em alguns segundos.' }
  }

  return { fieldErrors: {}, formError: body.message || 'Ocorreu um erro inesperado. Tente novamente.' }
}
