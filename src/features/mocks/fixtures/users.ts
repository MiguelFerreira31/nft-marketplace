import type { UpsertWalletRequest } from '@/shared/types'
import { placeholderImage } from './placeholder-image'
import { walletFixtures } from './wallets'

export interface UserSeedCartItem {
  editionId: string
  quantity: number
}

export interface UserSeed {
  id: string
  name: string
  email: string
  /** Senha em texto puro só existe aqui, no momento do seed — nunca persistida em claro (ver `db/seed.ts#hashPassword`). */
  password: string
  bio: string
  avatarUrl: string
  favoriteNftIds: string[]
  cartItems: UserSeedCartItem[]
  wallets: UpsertWalletRequest[]
}

/**
 * Credenciais fictícias documentadas (seção 12 do readme exige isso no
 * README final do `agent-devops`; aqui é a fonte de verdade que ele deve
 * citar). Duas contas (seção 6: "pelo menos dois usuários") com estados
 * iniciais diferentes de propósito:
 *
 * - `ana@example.com`   — favoritos, itens no carrinho e as duas carteiras
 *   (principal + secundária) já cadastradas.
 * - `bruno@example.com` — só a carteira principal cadastrada e carrinho
 *   vazio, para exercitar os estados "vazio"/"cadastrar carteira
 *   secundária" sem precisar de um terceiro usuário.
 */
export const MOCK_CREDENTIALS = {
  ana: { email: 'ana@example.com', password: 'Colecionar123!' },
  bruno: { email: 'bruno@example.com', password: 'Colecionar123!' },
} as const

export function buildUserFixtures(): UserSeed[] {
  return [
    {
      id: 'user-ana',
      name: 'Ana Martins',
      email: MOCK_CREDENTIALS.ana.email,
      password: MOCK_CREDENTIALS.ana.password,
      bio: 'Colecionadora de arte generativa e fotografia experimental.',
      avatarUrl: placeholderImage('Ana Martins', '#9333ea'),
      favoriteNftIds: ['nft-art-3', 'nft-gaming-2', 'nft-collectibles-5'],
      cartItems: [
        { editionId: 'nft-music-1-edition-1', quantity: 2 },
        { editionId: 'nft-photography-4-edition-1', quantity: 1 },
      ],
      wallets: walletFixtures.ana,
    },
    {
      id: 'user-bruno',
      name: 'Bruno Souza',
      email: MOCK_CREDENTIALS.bruno.email,
      password: MOCK_CREDENTIALS.bruno.password,
      bio: 'Entusiasta de mundos virtuais e colecionáveis numerados.',
      avatarUrl: placeholderImage('Bruno Souza', '#0f766e'),
      favoriteNftIds: ['nft-virtual-worlds-2'],
      cartItems: [],
      wallets: walletFixtures.bruno,
    },
  ]
}
