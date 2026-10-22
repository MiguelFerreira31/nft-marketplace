import type { Cart } from '@/shared/types'
import type { MockDb } from '../db/types'
import { mulEthByQuantity } from './decimal'
import { currentUser } from './auth'

/** Carrinho "ativo" da requisição: do usuário autenticado, ou o de visitante. */
export function resolveActiveCart(db: MockDb): Cart {
  const user = currentUser(db)
  return user ? user.cart : db.guestCart
}

/**
 * Recalcula `unitPriceEth`/`availableQuantity`/`subtotalEth` de cada item a
 * partir do estado ATUAL da edição correspondente em `db.nfts` — nunca do
 * valor congelado quando o item entrou no carrinho. Isso é o que faz um
 * `nft.updated` (preço/estoque, seção 7) refletir no carrinho mesmo sem o
 * cliente ter re-adicionado nada: a próxima leitura (`GET /cart`, cotação)
 * já vem atualizada, e o evento Socket.IO avisa a UI em tempo real.
 */
export function refreshCartPricing(db: MockDb, cart: Cart): Cart {
  cart.items = cart.items.map((item) => {
    const nft = db.nfts.find((candidate) => candidate.id === item.nftId)
    const edition = nft?.editions.find((candidate) => candidate.id === item.editionId)
    if (!edition) return item
    return {
      ...item,
      title: nft?.title ?? item.title,
      coverImageUrl: nft?.coverImageUrl ?? item.coverImageUrl,
      unitPriceEth: edition.priceEth,
      availableQuantity: edition.availableQuantity,
      subtotalEth: mulEthByQuantity(edition.priceEth, item.quantity),
    }
  })
  return cart
}
