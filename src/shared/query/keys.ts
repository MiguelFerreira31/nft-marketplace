import type { NftId, NftListQuery, OrderId, UserId } from '@/shared/types'

/**
 * Fábrica única de query keys. Toda chave de recurso privado (favoritos,
 * carrinho, perfil, carteiras) inclui o `UserId` (ou o literal `'guest'`
 * para visitante) como parte da key — isso é o mecanismo de ISOLAMENTO DE
 * CACHE POR USUÁRIO exigido pela seção 4 do readme: dois usuários nunca leem
 * a entrada de cache um do outro, e o logout/troca de usuário podem
 * invalidar/remover apenas as chaves do usuário anterior (ver
 * `ARCHITECTURE.md`).
 *
 * Toda chave de listagem (NFTs) inclui os parâmetros de busca completos —
 * isolamento por parâmetros: filtros diferentes nunca compartilham cache.
 */
export const queryKeys = {
  session: () => ['session'] as const,

  nfts: {
    all: () => ['nfts'] as const,
    list: (params: NftListQuery) => ['nfts', 'list', params] as const,
    detail: (nftId: NftId) => ['nfts', 'detail', nftId] as const,
  },

  favorites: {
    all: (userId: UserId) => ['favorites', userId] as const,
  },

  cart: {
    /** `'guest'` para carrinho de visitante (persistido localmente, ver ARCHITECTURE.md). */
    detail: (userId: UserId | 'guest') => ['cart', userId] as const,
  },

  quote: {
    detail: (cartId: string) => ['quote', cartId] as const,
  },

  orders: {
    detail: (orderId: OrderId) => ['orders', orderId] as const,
  },

  realtime: {
    nftEvents: () => ['realtime', 'nft-events'] as const,
  },

  profile: {
    detail: (userId: UserId) => ['profile', userId] as const,
  },

  wallets: {
    all: (userId: UserId) => ['wallets', userId] as const,
  },
} as const
