/**
 * Valida o destino de retomada pós-login (`search.redirect`, preenchido por
 * `requireAuth`). Só aceita caminhos internos (`/algo`) — nunca uma URL
 * absoluta/`//host` — para não abrir um open-redirect a partir de um link de
 * login manipulado.
 */
export function safeRedirectTarget(redirect: string | undefined, fallback = '/'): string {
  if (!redirect) return fallback
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return fallback
  return redirect
}
