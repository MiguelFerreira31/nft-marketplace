import type { Brand, IsoDateTime, NetworkId } from './common'

export const WALLET_NETWORKS = [
  { id: 'ethereum-mainnet-sim', label: 'Ethereum (simulada)' },
  { id: 'polygon-sim', label: 'Polygon (simulada)' },
] as const

export type WalletId = Brand<string, 'WalletId'>

export type WalletKind = 'primary' | 'secondary'

export interface Wallet {
  id: WalletId
  kind: WalletKind
  address: string
  network: NetworkId
  label: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface WalletsListResponse {
  items: Wallet[]
}

/**
 * Cadastro/edição de carteira principal ou secundária. `kind` identifica o
 * slot (no máximo uma carteira de cada `kind` por usuário) — reenviar o
 * mesmo `kind` atualiza a carteira existente daquele slot.
 */
export interface UpsertWalletRequest {
  kind: WalletKind
  address: string
  network: NetworkId
  label?: string | null
}

export type UpsertWalletResponse = Wallet
