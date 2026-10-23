import type { UpsertWalletRequest } from '@/shared/types'

/** Carteiras simuladas (endereços fictícios, nunca reais) para os usuários de `users.ts`. */
export const walletFixtures = {
  ana: [
    { kind: 'primary', address: '0x00A11CE000000000000000000000000000000001', network: 'ethereum-mainnet-sim', label: 'Carteira principal' },
    { kind: 'secondary', address: '0x00A11CE000000000000000000000000000000002', network: 'polygon-sim', label: 'Carteira de testes' },
  ] satisfies UpsertWalletRequest[],
  bruno: [{ kind: 'primary', address: '0x000B0B0000000000000000000000000000000001', network: 'ethereum-mainnet-sim', label: null }] satisfies UpsertWalletRequest[],
}
