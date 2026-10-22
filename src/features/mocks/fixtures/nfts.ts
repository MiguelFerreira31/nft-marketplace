import type { Edition, NftCategory, NftDetail } from './types'
import { collectionFixtures } from './collections'
import { creatorFixtures } from './creators'
import { placeholderImage } from './placeholder-image'

/**
 * 48 NFTs fictícios (6 categorias × 8 itens) — volume suficiente para
 * exercitar busca, filtros combinados, ordenação e paginação (seção 6 do
 * readme: "fixtures com variedade suficiente para exercitar filtros e
 * paginação"; sugestão do enunciado era 40-60).
 *
 * Determinístico de propósito: nada de `Math.random()` aqui. O mesmo
 * `buildNftFixtures()` sempre produz exatamente os mesmos 48 itens, nos
 * mesmos ids/preços/estoques — é isso que torna o reset (seção 6:
 * "restaurar integralmente um cenário conhecido") reproduzível.
 *
 * Três itens reservados com id estável para cenários determinísticos
 * documentados em `ARCHITECTURE.md`:
 * - `nft-sold-out-demo`      — todas as edições com `availableQuantity: 0`
 *   (acesso ao detalhe com "edição indisponível").
 * - `nft-low-stock-demo`     — uma edição com `availableQuantity: 1`
 *   (teste de "limite de quantidade" no carrinho/detalhe).
 * - `nft-price-drift-demo`   — usado pelo endpoint de controle
 *   `POST /api/__mock__/simulate/nft-update` para o roteiro da seção 7
 *   (preço/disponibilidade mudam enquanto o item está no carrinho).
 */
const CATEGORY_TITLES: Record<NftCategory, string[]> = {
  art: [
    'Aurora Fragmentada',
    'Retrato em Vapor',
    'Jardim Sintético',
    'Memória Líquida',
    'Horizonte Partido',
    'Camadas de Vidro',
    'Silhueta Nômade',
    'Constelação Íntima',
  ],
  music: [
    'Eco Noturno',
    'Frequência Zero',
    'Tambor de Maré',
    'Sinfonia Oculta',
    'Pulso Elétrico',
    'Canção do Satélite',
    'Ruído Fértil',
    'Acorde Suspenso',
  ],
  photography: [
    'Luz Residual',
    'Rua Vazia às 5h',
    'Reflexo Duplo',
    'Névoa Urbana',
    'Janela Alheia',
    'Sombra Comprida',
    'Instante Cinza',
    'Grão de Memória',
  ],
  gaming: [
    'Lâmina Procedural',
    'Portal Instável',
    'Guardião Pixelado',
    'Arena Infinita',
    'Loot Fantasma',
    'Boss Final .exe',
    'Checkpoint Perdido',
    'Respawn Dourado',
  ],
  collectibles: [
    'Selo da Primeira Era',
    'Moeda Comemorativa',
    'Distintivo Raro',
    'Cápsula do Tempo',
    'Carta Holográfica',
    'Miniatura Numerada',
    'Emblema Fundador',
    'Ficha de Colecionador',
  ],
  'virtual-worlds': [
    'Lote em Nova Delta',
    'Torre Flutuante',
    'Bioma Artificial',
    'Praça Central .meta',
    'Ilha Procedural',
    'Portal Intermundos',
    'Distrito Neon',
    'Refúgio Orbital',
  ],
}

const CATEGORY_PALETTE: Record<NftCategory, string> = {
  art: '#7c3aed',
  music: '#db2777',
  photography: '#334155',
  gaming: '#16a34a',
  collectibles: '#d97706',
  'virtual-worlds': '#0ea5e9',
}

const CATEGORIES = Object.keys(CATEGORY_TITLES) as NftCategory[]

const BASE_TIME = new Date('2026-09-01T12:00:00.000Z').getTime()
const DAY_MS = 24 * 60 * 60 * 1000

function buildEditions(nftId: string, basePriceEth: number, editionCount: number, stockPlan: number[]): Edition[] {
  return Array.from({ length: editionCount }, (_, editionIndex) => {
    const priceEth = (basePriceEth * (1 + editionIndex * 0.6)).toFixed(3)
    const totalQuantity = stockPlan[editionIndex] ?? 20
    return {
      id: `${nftId}-edition-${editionIndex + 1}` as Edition['id'],
      nftId: nftId as Edition['nftId'],
      name: editionCount === 1 ? 'Edição única' : `Edição ${editionIndex + 1} de ${editionCount}`,
      priceEth,
      availableQuantity: totalQuantity,
      totalQuantity,
    }
  })
}

function buildOne(categoryIndex: number, itemIndex: number): NftDetail {
  const category = CATEGORIES[categoryIndex]
  const title = CATEGORY_TITLES[category][itemIndex]
  const globalIndex = categoryIndex * 8 + itemIndex
  const id = `nft-${category}-${itemIndex + 1}`
  const creator = creatorFixtures[globalIndex % creatorFixtures.length]
  const collection = collectionFixtures[globalIndex % collectionFixtures.length]
  const editionCount = (globalIndex % 3) + 1
  const basePriceEth = 0.01 + categoryIndex * 0.35 + itemIndex * 0.08
  const stockPlan = [20 - itemIndex, 10, 5]
  const editions = buildEditions(id, basePriceEth, editionCount, stockPlan)
  const createdAt = new Date(BASE_TIME - globalIndex * 2 * DAY_MS).toISOString()

  return {
    id: id as NftDetail['id'],
    slug: id,
    title,
    coverImageUrl: placeholderImage(title, CATEGORY_PALETTE[category]),
    category,
    creator,
    collection,
    priceFromEth: editions[0].priceEth,
    favoriteCount: (globalIndex * 7) % 53,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    description:
      `"${title}" é uma peça da coleção ${collection.name}, criada por ${creator.name}. ` +
      'Dados e imagem são inteiramente simulados para fins do desafio — nenhuma integração real com blockchain.',
    galleryImageUrls: [
      placeholderImage(title, CATEGORY_PALETTE[category]),
      placeholderImage(`${title} detalhe`, CATEGORY_PALETTE[category], '#111827'),
      placeholderImage(`${title} verso`, CATEGORY_PALETTE[category]),
    ],
    editions,
  }
}

export function buildNftFixtures(): NftDetail[] {
  const items = CATEGORIES.flatMap((_category, categoryIndex) =>
    Array.from({ length: 8 }, (_, itemIndex) => buildOne(categoryIndex, itemIndex)),
  )

  const soldOut = items.find((item) => item.id === 'nft-art-1')
  if (soldOut) {
    soldOut.id = 'nft-sold-out-demo' as NftDetail['id']
    soldOut.slug = 'nft-sold-out-demo'
    soldOut.editions = soldOut.editions.map((edition) => ({
      ...edition,
      id: `nft-sold-out-demo-edition-${edition.name}` as Edition['id'],
      nftId: soldOut.id,
      availableQuantity: 0,
    }))
  }

  const lowStock = items.find((item) => item.id === 'nft-art-2')
  if (lowStock) {
    lowStock.id = 'nft-low-stock-demo' as NftDetail['id']
    lowStock.slug = 'nft-low-stock-demo'
    lowStock.editions = lowStock.editions.map((edition, index) => ({
      ...edition,
      id: `nft-low-stock-demo-edition-${index + 1}` as Edition['id'],
      nftId: lowStock.id,
      availableQuantity: index === 0 ? 1 : edition.availableQuantity,
      totalQuantity: index === 0 ? 1 : edition.totalQuantity,
    }))
  }

  const priceDrift = items.find((item) => item.id === 'nft-music-3')
  if (priceDrift) {
    priceDrift.id = 'nft-price-drift-demo' as NftDetail['id']
    priceDrift.slug = 'nft-price-drift-demo'
    priceDrift.editions = priceDrift.editions.map((edition, index) => ({
      ...edition,
      id: `nft-price-drift-demo-edition-${index + 1}` as Edition['id'],
      nftId: priceDrift.id,
    }))
  }

  return items
}
