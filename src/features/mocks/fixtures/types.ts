export type { Edition, NftCollection, NftCreator, NftDetail, NftId } from '@/shared/types'

/**
 * Categorias fictícias usadas pelas fixtures (seção 5: `NftListQuery.category`
 * é `string[]` no contrato — este union é só uma conveniência interna das
 * fixtures/handlers do mock, nunca um tipo exposto no contrato público).
 */
export type NftCategory = 'art' | 'music' | 'photography' | 'gaming' | 'collectibles' | 'virtual-worlds'

export const NFT_CATEGORIES: NftCategory[] = ['art', 'music', 'photography', 'gaming', 'collectibles', 'virtual-worlds']
