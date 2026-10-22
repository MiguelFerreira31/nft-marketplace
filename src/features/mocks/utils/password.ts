/**
 * Hash de senha simulado (seção 3 "Conta e sessão": "não armazene senhas em
 * claro"). SHA-256 via Web Crypto (`crypto.subtle`, disponível em browser e
 * em Node ≥20 via `globalThis.crypto`) — não é um hash de senha real
 * (faltaria salt + custo adaptativo tipo bcrypt/argon2), mas é suficiente
 * para a simulação: o objetivo aqui é só "nunca comparar/guardar texto
 * puro", não resistir a um ataque real. `agent-auth` (Fase 3) não precisa
 * reimplementar isto — só continuar chamando `hashPassword`/`verifyPassword`
 * através dos handlers de sessão.
 */
export async function hashPassword(plainText: string): Promise<string> {
  const encoded = new TextEncoder().encode(`nft-marketplace-mock-salt:${plainText}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return (await hashPassword(plainText)) === hash
}
