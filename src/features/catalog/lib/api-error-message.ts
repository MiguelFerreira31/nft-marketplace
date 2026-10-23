import { getApiErrorBody, isApiError } from '@/shared/api/http'

/**
 * Traduz um erro de query/mutation (Axios) numa mensagem amigável para o
 * catálogo/detalhe — reaproveitada pelos estados de erro da listagem, do
 * detalhe, do favorito e da adição ao carrinho, para não haver uma mensagem
 * diferente por componente.
 */
export function describeQueryError(error: unknown): string {
  if (!isApiError(error)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }

  const body = getApiErrorBody(error)
  if (!body) {
    return 'Ocorreu um erro inesperado. Tente novamente.'
  }

  switch (body.code) {
    case 'TRANSIENT_ERROR':
      return 'Falha temporária no servidor. Tente novamente em alguns segundos.'
    case 'NOT_FOUND':
      return 'Recurso não encontrado.'
    case 'INVALID_SESSION':
      return 'Sua sessão expirou. Entre novamente para continuar.'
    case 'CONFLICT':
      return body.reason === 'STOCK_UNAVAILABLE'
        ? 'A disponibilidade dessa edição mudou. Atualizando os dados…'
        : body.message || 'Conflito ao processar a operação.'
    default:
      return body.message || 'Ocorreu um erro inesperado. Tente novamente.'
  }
}
