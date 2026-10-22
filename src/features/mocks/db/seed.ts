import type { Cart, CartItem, CartItemId, UserId, Wallet, WalletId } from '@/shared/types'
import { buildCouponFixtures, buildNftFixtures, buildUserFixtures } from '../fixtures'
import { mulEthByQuantity } from '../utils/decimal'
import { createMockId } from '../utils/ids'
import { hashPassword } from '../utils/password'
import type { MockDb, MockUserRecord } from './types'

const SCHEMA_VERSION = 1

function findEdition(nfts: ReturnType<typeof buildNftFixtures>, editionId: string) {
  for (const nft of nfts) {
    const edition = nft.editions.find((candidate) => candidate.id === editionId)
    if (edition) return { nft, edition }
  }
  throw new Error(`[mocks] fixture de carrinho referencia edição inexistente: ${editionId}`)
}

function buildCartFromSeed(
  cartId: string,
  items: { editionId: string; quantity: number }[],
  nfts: ReturnType<typeof buildNftFixtures>,
): Cart {
  const now = new Date().toISOString()
  const cartItems: CartItem[] = items.map(({ editionId, quantity }) => {
    const { nft, edition } = findEdition(nfts, editionId)
    return {
      id: createMockId('cart-item') as CartItemId,
      nftId: nft.id,
      editionId: edition.id,
      title: nft.title,
      coverImageUrl: nft.coverImageUrl,
      unitPriceEth: edition.priceEth,
      quantity,
      availableQuantity: edition.availableQuantity,
      subtotalEth: mulEthByQuantity(edition.priceEth, quantity),
    }
  })
  return { id: cartId, items: cartItems, couponCode: null, updatedAt: now }
}

function buildWallet(seed: { kind: Wallet['kind']; address: string; network: string; label?: string | null }): Wallet {
  const now = new Date().toISOString()
  return {
    id: createMockId('wallet') as WalletId,
    kind: seed.kind,
    address: seed.address,
    network: seed.network,
    label: seed.label ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Constrói um `MockDb` pristino a partir das fixtures determinísticas. É a
 * ÚNICA função que sabe transformar fixtures "de leitura fácil" no shape
 * interno completo (preços/estoque calculados, senhas com hash, etc.) — tanto
 * o primeiro boot quanto o reset de cenário (seção 6) passam por aqui.
 */
export async function createSeedDb(): Promise<MockDb> {
  const nfts = buildNftFixtures()
  const userSeeds = buildUserFixtures()

  const users: MockUserRecord[] = await Promise.all(
    userSeeds.map(async (seed): Promise<MockUserRecord> => {
      const now = new Date().toISOString()
      const favorites: Record<string, string> = {}
      for (const nftId of seed.favoriteNftIds) favorites[nftId] = now
      return {
        id: seed.id as UserId,
        name: seed.name,
        email: seed.email,
        passwordHash: await hashPassword(seed.password),
        avatarUrl: seed.avatarUrl,
        bio: seed.bio,
        createdAt: now,
        updatedAt: now,
        favorites,
        wallets: seed.wallets.map(buildWallet),
        cart: buildCartFromSeed(seed.id, seed.cartItems, nfts),
      }
    }),
  )

  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    nfts,
    guestCart: { id: 'guest', items: [], couponCode: null, updatedAt: new Date().toISOString() },
    session: null,
    coupons: buildCouponFixtures(),
    orders: {},
    idempotency: {},
    orderEventVersions: {},
    quoteState: {},
  }
}

export { SCHEMA_VERSION }
