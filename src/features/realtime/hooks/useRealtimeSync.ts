import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/keys'
import type {
  Cart,
  NftDetail,
  NftListResponse,
  NftSummary,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  Session,
  UserId,
} from '@/shared/types'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { getSessionSocket } from '../client/session-socket'
import type { RealtimeCartNftUpdate } from './useRealtimeNftEvents'

const MAX_SEEN_EVENT_IDS = 500

function identityOf(session: Session | null | undefined): string {
  if (session === null) return 'guest'
  if (!session) return 'unresolved'
  return `${session.user.id}:${session.expiresAt}`
}

function isValidNftEvent(event: NftUpdatedEvent): boolean {
  const payload = event?.payload
  return Boolean(
    event?.id &&
      event.resource === 'nft' &&
      event.resourceId === payload?.nftId &&
      Number.isSafeInteger(event.version) &&
      event.version > 0 &&
      (!payload.priceEth || /^\d+(?:\.\d+)?$/.test(payload.priceEth)) &&
      (!payload.priceFromEth || /^\d+(?:\.\d+)?$/.test(payload.priceFromEth)) &&
      (payload.availableQuantity === undefined ||
        (Number.isSafeInteger(payload.availableQuantity) && payload.availableQuantity >= 0)),
  )
}

function isValidOrderEvent(event: OrderUpdatedEvent): boolean {
  return Boolean(
    event?.id &&
      event.resource === 'order' &&
      event.resourceId === event.payload?.orderId &&
      Number.isSafeInteger(event.version) &&
      event.version > 0 &&
      ['pending', 'confirmed', 'refused'].includes(event.payload.status),
  )
}

function cachedNftVersion(queryClient: ReturnType<typeof useQueryClient>, nftId: string): number {
  let version = 0

  for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: queryKeys.nfts.all() })) {
    if (queryKey[1] === 'list') {
      const list = data as NftListResponse | undefined
      const nft = list?.items.find((item) => item.id === nftId)
      if (nft) version = Math.max(version, nft.version)
    } else if (queryKey[1] === 'detail') {
      const detail = data as NftDetail | undefined
      if (detail?.id === nftId) version = Math.max(version, detail.version)
    }
  }

  return version
}

function patchNftCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  event: NftUpdatedEvent,
): void {
  for (const [queryKey] of queryClient.getQueriesData({ queryKey: queryKeys.nfts.all() })) {
    queryClient.setQueryData<unknown>(queryKey, (current: unknown) => {
      if (!current) return current

      if (queryKey[1] === 'list') {
        const list = current as NftListResponse
        return {
          ...list,
          items: list.items.map((nft): NftSummary =>
            nft.id === event.resourceId
              ? {
                  ...nft,
                  priceFromEth: event.payload.priceFromEth ?? nft.priceFromEth,
                  version: event.version,
                  updatedAt: event.occurredAt,
                }
              : nft,
          ),
        }
      }

      if (queryKey[1] === 'detail') {
        const detail = current as NftDetail
        if (detail.id !== event.resourceId) return detail
        return {
          ...detail,
          priceFromEth: event.payload.priceFromEth ?? detail.priceFromEth,
          version: event.version,
          updatedAt: event.occurredAt,
          editions: detail.editions.map((edition) =>
            edition.id === event.payload.editionId
              ? {
                  ...edition,
                  priceEth: event.payload.priceEth ?? edition.priceEth,
                  availableQuantity: event.payload.availableQuantity ?? edition.availableQuantity,
                }
              : edition,
          ),
        }
      }

      return current
    })
  }
}

function rememberEventId(seenIds: Set<string>, eventId: string): boolean {
  if (seenIds.has(eventId)) return false
  seenIds.add(eventId)
  if (seenIds.size > MAX_SEEN_EVENT_IDS) {
    const oldestId = seenIds.values().next().value
    if (oldestId) seenIds.delete(oldestId)
  }
  return true
}

function isActiveQuery(queryClient: ReturnType<typeof useQueryClient>, queryKey: readonly unknown[]): boolean {
  return queryClient
    .getQueryCache()
    .findAll({ queryKey, exact: true })
    .some((query) => query.getObserversCount() > 0)
}

export function useRealtimeSync(): void {
  const queryClient = useQueryClient()
  const sessionQuery = useSessionQuery()
  const sessionIdentity = identityOf(sessionQuery.data)

  useEffect(() => {
    if (!sessionQuery.isSuccess) return

    const socket = getSessionSocket()
    const sessionAtSubscription = sessionQuery.data
    const seenIds = new Set<string>()
    const nftVersions = new Map<string, number>()
    const orderVersions = new Map<string, number>()
    let reconciling = false

    const isCurrentSession = () => {
      const currentSession = queryClient.getQueryData<Session | null>(queryKeys.session())
      return currentSession === sessionAtSubscription && identityOf(currentSession) === sessionIdentity
    }

    const rememberCartUpdate = (event: NftUpdatedEvent) => {
      if (!isCurrentSession()) return
      const session = queryClient.getQueryData<Session | null>(queryKeys.session())
      const userId = (session?.user.id ?? 'guest') as UserId | 'guest'
      const cart = queryClient.getQueryData<Cart>(queryKeys.cart.detail(userId))
      if (!cart?.items.some((item) => item.nftId === event.resourceId)) return

      queryClient.setQueryData<RealtimeCartNftUpdate[]>(queryKeys.realtime.nftEvents(), (updates = []) => {
        if (updates.some((update) => update.event.id === event.id)) return updates
        return [...updates.slice(-(MAX_SEEN_EVENT_IDS - 1)), { event, cartId: cart.id }]
      })
    }

    const reconcileActiveResources = async () => {
      if (reconciling || !isCurrentSession()) return
      reconciling = true
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all(), refetchType: 'active' }),
          queryClient.invalidateQueries({ queryKey: ['orders'], refetchType: 'active' }),
        ])
        if (!isCurrentSession()) return
        await queryClient.invalidateQueries({ queryKey: ['cart'], refetchType: 'active' })
        if (!isCurrentSession()) return
        await queryClient.invalidateQueries({ queryKey: ['quote'], refetchType: 'active' })
      } finally {
        reconciling = false
      }
    }

    const handleNftUpdated = (event: NftUpdatedEvent) => {
      if (!isCurrentSession() || !isValidNftEvent(event) || !rememberEventId(seenIds, event.id)) return

      const lastVersion = Math.max(nftVersions.get(event.resourceId) ?? 0, cachedNftVersion(queryClient, event.resourceId))
      if (event.version <= lastVersion) return

      nftVersions.set(event.resourceId, event.version)
      patchNftCaches(queryClient, event)
      rememberCartUpdate(event)

      void (async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all(), refetchType: 'active' }),
          queryClient.invalidateQueries({ queryKey: ['cart'], refetchType: 'active' }),
        ])
        if (!isCurrentSession()) return
        rememberCartUpdate(event)
        await queryClient.invalidateQueries({ queryKey: ['quote'], refetchType: 'active' })
      })()
    }

    const handleOrderUpdated = (event: OrderUpdatedEvent) => {
      if (!isCurrentSession() || !isValidOrderEvent(event) || !rememberEventId(seenIds, event.id)) return

      const key = queryKeys.orders.detail(event.resourceId as Order['id'])
      const order = queryClient.getQueryData<Order>(key)
      const lastVersion = Math.max(orderVersions.get(event.resourceId) ?? 0, order?.version ?? 0)
      if (event.version <= lastVersion || order?.status === 'confirmed' || order?.status === 'refused') return

      orderVersions.set(event.resourceId, event.version)
      if (!isActiveQuery(queryClient, key)) return
      void queryClient.invalidateQueries({ queryKey: key, exact: true, refetchType: 'active' })
    }

    const handleConnect = () => {
      void reconcileActiveResources()
    }

    socket.on('connect', handleConnect)
    socket.on('nft.updated', handleNftUpdated)
    socket.on('order.updated', handleOrderUpdated)
    let active = true
    queueMicrotask(() => {
      if (active) socket.connect()
    })

    return () => {
      active = false
      socket.off('connect', handleConnect)
      socket.off('nft.updated', handleNftUpdated)
      socket.off('order.updated', handleOrderUpdated)
      socket.disconnect()
    }
  }, [queryClient, sessionIdentity, sessionQuery.data, sessionQuery.isSuccess])
}
