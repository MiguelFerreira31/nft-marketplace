import { describe, expect, it } from 'vitest'
import type { NftDetail, NftListQuery } from '@/shared/types'
import { queryNfts, toSummary } from './nft-query'

/**
 * `queryNfts` concentra TODA a lógica de busca/filtros/ordenação/paginação
 * do catálogo (readme §5: "Listagem com busca/filtros/ordenação/paginação")
 * — exercitada aqui com fixtures mínimas e determinísticas, sem depender das
 * 48 fixtures reais de `features/mocks/fixtures/nfts.ts`.
 */
function makeNft(overrides: Partial<Omit<NftDetail, 'id'>> & { id: string }): NftDetail {
  return {
    slug: overrides.id,
    title: overrides.id,
    coverImageUrl: 'https://example.test/cover.png',
    category: 'art',
    creator: { id: 'creator-1', name: 'Criador Teste', avatarUrl: null },
    collection: { id: 'collection-1', name: 'Coleção Teste' },
    priceFromEth: '1',
    favoriteCount: 0,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    description: 'Descrição de teste.',
    galleryImageUrls: [],
    editions: [],
    ...overrides,
  } as NftDetail
}

function baseQuery(overrides: Partial<NftListQuery> = {}): NftListQuery {
  return { page: 1, pageSize: 12, ...overrides }
}

const fixtures: NftDetail[] = [
  makeNft({ id: 'nft-art-1', title: 'Aurora Fragmentada', category: 'art', priceFromEth: '1.0', favoriteCount: 10, createdAt: '2026-01-03T00:00:00.000Z' }),
  makeNft({ id: 'nft-art-2', title: 'Jardim Sintético', category: 'art', priceFromEth: '0.5', favoriteCount: 30, createdAt: '2026-01-01T00:00:00.000Z' }),
  makeNft({ id: 'nft-music-1', title: 'Eco Noturno', category: 'music', priceFromEth: '2.0', favoriteCount: 20, createdAt: '2026-01-02T00:00:00.000Z' }),
]

describe('queryNfts — search', () => {
  it('matches by title, case-insensitively', () => {
    const result = queryNfts(fixtures, baseQuery({ search: 'aurora' }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-art-1'])
  })

  it('matches by collection or creator name', () => {
    const result = queryNfts(fixtures, baseQuery({ search: 'Coleção Teste' }), null)
    expect(result.total).toBe(fixtures.length)
  })

  it('returns everything for an empty/whitespace search', () => {
    const result = queryNfts(fixtures, baseQuery({ search: '   ' }), null)
    expect(result.total).toBe(fixtures.length)
  })
})

describe('queryNfts — filters', () => {
  it('filters by a single category', () => {
    const result = queryNfts(fixtures, baseQuery({ category: ['music'] }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-music-1'])
  })

  it('combines category with a price range (both must match)', () => {
    const result = queryNfts(fixtures, baseQuery({ category: ['art'], priceMinEth: '0.8' }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-art-1'])
  })

  it('filters by priceMinEth and priceMaxEth together', () => {
    const result = queryNfts(fixtures, baseQuery({ priceMinEth: '0.6', priceMaxEth: '1.5' }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-art-1'])
  })
})

describe('queryNfts — sorting', () => {
  it('sorts by relevance (favoriteCount) descending by default', () => {
    const result = queryNfts(fixtures, baseQuery(), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-art-2', 'nft-music-1', 'nft-art-1'])
  })

  it('sorts by price ascending', () => {
    const result = queryNfts(fixtures, baseQuery({ sortKey: 'price', sortOrder: 'asc' }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-art-2', 'nft-art-1', 'nft-music-1'])
  })

  it('sorts by price descending', () => {
    const result = queryNfts(fixtures, baseQuery({ sortKey: 'price', sortOrder: 'desc' }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-music-1', 'nft-art-1', 'nft-art-2'])
  })

  it('sorts by newest first', () => {
    const result = queryNfts(fixtures, baseQuery({ sortKey: 'newest', sortOrder: 'desc' }), null)
    expect(result.items.map((item) => item.id)).toEqual(['nft-art-1', 'nft-music-1', 'nft-art-2'])
  })
})

describe('queryNfts — pagination', () => {
  it('paginates and reports totalPages based on the filtered set, not the whole catalog', () => {
    const page1 = queryNfts(fixtures, baseQuery({ pageSize: 2 }), null)
    expect(page1.items).toHaveLength(2)
    expect(page1.total).toBe(3)
    expect(page1.totalPages).toBe(2)

    const page2 = queryNfts(fixtures, baseQuery({ page: 2, pageSize: 2 }), null)
    expect(page2.items).toHaveLength(1)
  })

  it('clamps page/pageSize to at least 1', () => {
    const result = queryNfts(fixtures, baseQuery({ page: 0, pageSize: 0 }), null)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(1)
  })
})

describe('toSummary', () => {
  it('strips description/galleryImageUrls/editions from the detail shape', () => {
    const summary = toSummary(fixtures[0], null)
    expect(summary).not.toHaveProperty('description')
    expect(summary).not.toHaveProperty('galleryImageUrls')
    expect(summary).not.toHaveProperty('editions')
    expect(summary).not.toHaveProperty('isFavorited')
  })

  it('adds isFavorited only for an authenticated request (Set provided)', () => {
    const favorited = toSummary(fixtures[0], new Set([fixtures[0].id]))
    const notFavorited = toSummary(fixtures[1], new Set([fixtures[0].id]))
    expect(favorited.isFavorited).toBe(true)
    expect(notFavorited.isFavorited).toBe(false)
  })
})
