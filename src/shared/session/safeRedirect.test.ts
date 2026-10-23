import { describe, expect, it } from 'vitest'
import { safeRedirectTarget } from './safeRedirect'

/**
 * Proteção contra open-redirect no retorno pós-login (`search.redirect`,
 * preenchido por `requireAuth`/`FavoriteButton`) — validada manualmente na
 * Fase 1 (ver `ARCHITECTURE.md`); este teste a torna permanente.
 */
describe('safeRedirectTarget', () => {
  it('falls back to "/" when no redirect is given', () => {
    expect(safeRedirectTarget(undefined)).toBe('/')
  })

  it('uses a custom fallback when provided', () => {
    expect(safeRedirectTarget(undefined, '/account/profile')).toBe('/account/profile')
  })

  it('accepts an internal path', () => {
    expect(safeRedirectTarget('/cart')).toBe('/cart')
  })

  it('accepts an internal path with a query string', () => {
    expect(safeRedirectTarget('/?category=art&page=2')).toBe('/?category=art&page=2')
  })

  it('rejects a protocol-relative URL ("//host") to prevent open redirect', () => {
    expect(safeRedirectTarget('//evil.example.com')).toBe('/')
  })

  it('rejects an absolute URL with a scheme', () => {
    expect(safeRedirectTarget('https://evil.example.com')).toBe('/')
  })

  it('rejects a path that does not start with "/"', () => {
    expect(safeRedirectTarget('evil.example.com')).toBe('/')
  })

  it('rejects an empty string (falsy) and uses the fallback', () => {
    expect(safeRedirectTarget('')).toBe('/')
  })
})
