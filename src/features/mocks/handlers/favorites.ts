import { HttpResponse, http } from 'msw'
import type { AddFavoriteRequest, AddFavoriteResponse, FavoritesListResponse, NftId, RemoveFavoriteResponse } from '@/shared/types'
import { getDb, persistDb } from '../db/store'
import { requireUser } from '../utils/auth'
import { notFoundError } from '../utils/http-error'
import { toSummary } from '../utils/nft-query'
import { withScenario } from '../utils/with-scenario'

export const favoritesHandlers = [
  http.get(
    '/api/favorites',
    withScenario('favorites.list', async () => {
      const db = await getDb()
      const user = requireUser(db)
      const favoritedIds = new Set(Object.keys(user.favorites))
      const items = db.nfts
        .filter((nft) => favoritedIds.has(nft.id))
        .sort((a, b) => new Date(user.favorites[b.id]).getTime() - new Date(user.favorites[a.id]).getTime())
        .map((nft) => toSummary(nft, favoritedIds))
      const response: FavoritesListResponse = { items }
      return HttpResponse.json(response)
    }),
  ),

  http.post(
    '/api/favorites',
    withScenario('favorites.add', async ({ request }) => {
      const db = await getDb()
      const user = requireUser(db)
      const body = (await request.json()) as AddFavoriteRequest
      const nft = db.nfts.find((candidate) => candidate.id === body.nftId)
      if (!nft) throw notFoundError('nft', 'NFT não encontrado.')

      const favoritedAt = user.favorites[nft.id] ?? new Date().toISOString()
      user.favorites[nft.id] = favoritedAt
      persistDb(db)

      const response: AddFavoriteResponse = { nftId: nft.id, favoritedAt }
      return HttpResponse.json(response, { status: 201 })
    }),
  ),

  http.delete(
    '/api/favorites/:nftId',
    withScenario('favorites.remove', async ({ params }) => {
      const db = await getDb()
      const user = requireUser(db)
      const nftId = params.nftId as NftId
      delete user.favorites[nftId]
      persistDb(db)

      const response: RemoveFavoriteResponse = null
      return HttpResponse.json(response)
    }),
  ),
]
