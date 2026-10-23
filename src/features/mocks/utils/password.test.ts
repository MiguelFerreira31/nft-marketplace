import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

/**
 * Hash de senha simulado (readme §3: "não armazene senhas em claro"). Não é
 * uma suíte de criptografia — só garante o contrato que `handlers/session.ts`
 * e `handlers/profile.ts` dependem de: determinístico, nunca igual ao texto
 * puro, e verificável.
 */
describe('hashPassword/verifyPassword', () => {
  it('never stores the plain text as the hash', async () => {
    const hash = await hashPassword('Colecionar123!')
    expect(hash).not.toBe('Colecionar123!')
  })

  it('produces a deterministic SHA-256 hex digest (64 chars)', async () => {
    const first = await hashPassword('Colecionar123!')
    const second = await hashPassword('Colecionar123!')
    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different hashes for different passwords', async () => {
    const a = await hashPassword('Colecionar123!')
    const b = await hashPassword('OutraSenha456!')
    expect(a).not.toBe(b)
  })

  it('verifies the correct password against its hash', async () => {
    const hash = await hashPassword('Colecionar123!')
    expect(await verifyPassword('Colecionar123!', hash)).toBe(true)
  })

  it('rejects an incorrect password against an existing hash', async () => {
    const hash = await hashPassword('Colecionar123!')
    expect(await verifyPassword('senha-incorreta', hash)).toBe(false)
  })

  it('is case- and whitespace-sensitive', async () => {
    const hash = await hashPassword('Colecionar123!')
    expect(await verifyPassword('colecionar123!', hash)).toBe(false)
    expect(await verifyPassword('Colecionar123! ', hash)).toBe(false)
  })
})
