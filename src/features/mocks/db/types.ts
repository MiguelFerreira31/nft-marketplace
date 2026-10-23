import type {
  Cart,
  IdempotencyKey,
  IsoDateTime,
  NftDetail,
  Order,
  UserId,
  Wallet,
} from '@/shared/types'
import type { CouponFixture } from '../fixtures/coupons'

/**
 * Registro interno de usuário. NUNCA exposto como está por nenhum handler —
 * cada handler converte para o tipo público (`Profile`, `Session`, etc.) de
 * `shared/types`. `passwordHash` nunca é texto puro (seção 3 "Conta e
 * sessão": "não armazene senhas em claro").
 */
export interface MockUserRecord {
  id: UserId
  name: string
  email: string
  passwordHash: string
  avatarUrl: string | null
  bio: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  /** nftId → momento em que foi favoritado, preserva ordem de inclusão. */
  favorites: Record<string, IsoDateTime>
  wallets: Wallet[]
  cart: Cart
}

export interface MockSessionPointer {
  userId: UserId
  /**
   * Token opaco devolvido implicitamente via sessão (não há transporte real
   * de cookie/token no cliente ainda — Fase 3/`agent-auth` decide isso).
   * Mantido aqui só para permitir múltiplos "logins" não colidirem ao
   * inspecionar o estado via devtools/testes.
   */
  token: string
  expiresAt: IsoDateTime
}

export interface IdempotencyRecord {
  payload: unknown
  orderId: Order['id']
  /** `true` enquanto a 1ª resposta desta chave está deliberadamente atrasada (cenário de timeout pós-criação). */
  pendingTimeout: boolean
}

/**
 * Registro interno de pedido — guarda o `Order` público (ver `shared/types/orders.ts`)
 * mais metadados que o contrato REST não expõe mas que o backend simulado
 * precisa para reconciliar carrinho/estoque na confirmação (seção 3:
 * "após confirmação, remover do carrinho apenas os itens e quantidades
 * comprados") e para isolar pedidos por usuário (seção 4/11: nenhuma
 * exposição de dados entre usuários).
 */
export interface MockOrderRecord {
  order: Order
  cartId: string
  ownerUserId: UserId
}

/**
 * Banco de dados simulado, inteiramente em memória + persistido (ver
 * `storage.ts`). Única fonte de verdade para TODOS os handlers REST — é isto
 * que torna catálogo/favoritos/carrinho/perfil/carteiras/pedidos
 * consistentes entre si (seção 6 do readme).
 */
export interface MockDb {
  /** Versão do schema das fixtures — mudar isto força um reseed (ver `store.ts`). Bump ao alterar o shape abaixo. */
  schemaVersion: number
  users: MockUserRecord[]
  nfts: NftDetail[]
  guestCart: Cart
  session: MockSessionPointer | null
  coupons: CouponFixture[]
  orders: Record<string, MockOrderRecord>
  idempotency: Record<IdempotencyKey, IdempotencyRecord>
  /** Versão monotônica por pedido, compartilhada pelo contrato REST e envelope `order.updated`. */
  orderEventVersions: Record<string, number>
  /**
   * `quoteVersion` por carrinho (`cartId`): incrementa quando o "fingerprint"
   * (itens/preços/cupom) muda de uma leitura para outra — não a cada `GET`
   * repetido com o mesmo resultado. Isso é o que permite ao checkout
   * detectar uma cotação desatualizada (seção 7) sem invalidar toda leitura
   * legítima (ex.: refetch do React Query sem nenhuma mudança real).
   */
  quoteState: Record<string, { fingerprint: string; version: number }>
}
