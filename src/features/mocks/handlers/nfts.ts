import { HttpResponse, http } from 'msw'
import type { NftId, NftListQuery, NftListResponse, NftSortKey, SortOrder } from '@/shared/types'
import { getDb } from '../db/store'
import { getScenario } from '../scenario'
import { currentUser } from '../utils/auth'
import { notFoundError } from '../utils/http-error'
import { queryNfts } from '../utils/nft-query'
import { withScenario } from '../utils/with-scenario'

const SORT_KEYS: NftSortKey[] = ['relevance', 'price', 'newest']
const SORT_ORDERS: SortOrder[] = ['asc', 'desc']

function parseListQuery(url: URL): NftListQuery {
  const params = url.searchParams
  const category = [...params.getAll('category'), ...params.getAll('category[]')]
  const sortKeyRaw = params.get('sortKey')
  const sortOrderRaw = params.get('sortOrder')

  return {
    page: Number(params.get('page')) || 1,
    pageSize: Number(params.get('pageSize')) || 12,
    search: params.get('search') ?? undefined,
    category: category.length > 0 ? category : undefined,
    priceMinEth: params.get('priceMinEth') ?? undefined,
    priceMaxEth: params.get('priceMaxEth') ?? undefined,
    sortKey: SORT_KEYS.includes(sortKeyRaw as NftSortKey) ? (sortKeyRaw as NftSortKey) : undefined,
    sortOrder: SORT_ORDERS.includes(sortOrderRaw as SortOrder) ? (sortOrderRaw as SortOrder) : undefined,
  }
}

export const nftHandlers = [
  http.get(
    '/api/nfts',
    withScenario('nfts.list', async ({ request }) => {
      const db = await getDb()
      const scenario = getScenario()
      const user = currentUser(db)
      const favoritedNftIds = user ? new Set(Object.keys(user.favorites)) : null

      if (scenario.forceEmpty.includes('nfts.list')) {
        const empty: NftListResponse = { items: [], page: 1, pageSize: 12, total: 0, totalPages: 1 }
        return HttpResponse.json(empty)
      }

      const query = parseListQuery(new URL(request.url))
      const response: NftListResponse = queryNfts(db.nfts, query, favoritedNftIds)
      return HttpResponse.json(response)
    }),
  ),

  http.get(
    '/api/nfts/:nftId',
    withScenario('nfts.detail', async ({ params }) => {
      const db = await getDb()
      const nftId = params.nftId as NftId
      const nft = db.nfts.find((candidate) => candidate.id === nftId)
      if (!nft) throw notFoundError('nft', 'NFT não encontrado.')

      const user = currentUser(db)
      const isFavorited = user ? nftId in user.favorites : undefined

      return HttpResponse.json({ ...nft, isFavorited })
    }),
  ),
]
