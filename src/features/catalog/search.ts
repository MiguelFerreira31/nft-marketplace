import type { SearchSchemaInput } from '@tanstack/react-router'
import type { NftListQuery, NftSortKey, SortOrder } from '@/shared/types'

/**
 * Schema de parâmetros de busca da rota `/` (Início — readme §3 "Catálogo e
 * detalhe": "Busca, filtros, ordenação e paginação devem compor o estado da
 * URL e sobreviver a refresh e navegação pelo histórico").
 *
 * Deliberadamente reaproveita `NftListQuery` (contrato da Fase 0,
 * `shared/types/nft.ts`) em vez de declarar um shape próprio — a URL e a
 * query da API devem ser o mesmo objeto, sem tradução, para não haver dois
 * "formatos de verdade" para os mesmos filtros.
 *
 * A validação aqui é propositalmente defensiva (coerção de tipos + defaults)
 * e não tenta aplicar regras de negócio (ex.: `priceMin <= priceMax`,
 * categorias válidas) — isso é escopo da Fase 4 (`agent-catalog`), que já
 * recebe o parâmetro tipado e decide o que fazer com valores
 * inconsistentes.
 */

const SORT_KEYS: readonly NftSortKey[] = ['relevance', 'price', 'newest']
const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc']

export const CATALOG_SEARCH_DEFAULTS = {
  page: 1,
  pageSize: 12,
} satisfies Pick<NftListQuery, 'page' | 'pageSize'>

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    return items.length > 0 ? items : undefined
  }
  if (typeof value === 'string' && value.length > 0) return [value]
  return undefined
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback
}

function toEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

/**
 * Shape aceito por quem NAVEGA para `/` (ex.: `<Link to="/" search={...} />`)
 * — todos os campos opcionais, porque `page`/`pageSize` têm default aplicado
 * por `catalogSearchSchema`. O `& SearchSchemaInput` é o escape hatch do
 * TanStack Router para declarar esse shape de entrada diferente do shape de
 * saída (`NftListQuery`, com `page`/`pageSize` sempre resolvidos) sem usar
 * uma lib de validação — sem ele, todo `<Link to="/">` seria obrigado a
 * passar `page`/`pageSize` explicitamente.
 */
type CatalogSearchInput = Partial<NftListQuery> & SearchSchemaInput

/** `validateSearch` da rota `/` — usado por `createFileRoute('/')`. */
export function catalogSearchSchema(search: CatalogSearchInput): NftListQuery {
  // A entrada real em runtime vem do parser de querystring do router (valores
  // crus, não necessariamente nos tipos declarados acima) — por isso a
  // validação abaixo trata tudo como `unknown` e nunca confia no tipo
  // declarado do parâmetro.
  const raw = search as Record<string, unknown>
  return {
    search: typeof raw.search === 'string' && raw.search.length > 0 ? raw.search : undefined,
    category: toStringArray(raw.category),
    priceMinEth: typeof raw.priceMinEth === 'string' ? raw.priceMinEth : undefined,
    priceMaxEth: typeof raw.priceMaxEth === 'string' ? raw.priceMaxEth : undefined,
    sortKey: toEnum(raw.sortKey, SORT_KEYS),
    sortOrder: toEnum(raw.sortOrder, SORT_ORDERS),
    page: toPositiveInt(raw.page, CATALOG_SEARCH_DEFAULTS.page),
    pageSize: toPositiveInt(raw.pageSize, CATALOG_SEARCH_DEFAULTS.pageSize),
  }
}
