/**
 * Tipos básicos compartilhados por TODOS os recursos REST (seção 5 do
 * readme.md). Estes tipos são a única fonte de verdade para os formatos de
 * dados usados pelo MSW (Fase 2), pelo client Axios (`src/shared/api`) e pela
 * UI (`src/features/*`). Nenhuma camada deve redefinir estes shapes.
 */

/**
 * REGRA DE PRECISÃO — valores em ETH
 * ------------------------------------------------------------------
 * Todo valor monetário em ETH trafega como STRING DECIMAL (nunca `number`),
 * para não perder precisão em operações de ponto flutuante binário
 * (ex.: 0.1 + 0.2 !== 0.3 em IEEE-754). A API é a fonte da verdade: o cliente
 * NUNCA deriva um total em ETH localmente de forma divergente do valor
 * recebido — apenas formata para exibição.
 *
 * Formato esperado: dígitos decimais, ponto como separador, sem notação
 * científica, sem separador de milhar (ex.: "1.5", "0.001", "120").
 * Operações aritméticas sobre `EthAmount` (quando necessárias no cliente,
 * ex.: conferência de exibição) devem usar uma lib de decimal arbitrário
 * (ex.: `decimal.js`) — nunca `Number(value) + Number(other)`.
 */
export type EthAmount = string

/**
 * REGRA DE QUANTIDADE
 * ------------------------------------------------------------------
 * Quantidades (itens de carrinho, edições disponíveis, etc.) são sempre
 * números inteiros não negativos. Nunca strings, nunca fracionários.
 */
export type Quantity = number

/** Timestamp ISO-8601 em UTC (ex.: "2026-10-22T12:00:00.000Z"). */
export type IsoDateTime = string

/** Chave de idempotência enviada no header `Idempotency-Key` (seção 5). */
export type IdempotencyKey = string

/** Identificador de rede simulada de carteira (ex.: "ethereum-mainnet-sim"). */
export type NetworkId = string

export type SortOrder = 'asc' | 'desc'

/**
 * Envelope de paginação usado por toda listagem (hoje: apenas NFTs, mas o
 * shape é reaproveitável por qualquer outra listagem futura).
 */
export interface PaginatedResponse<TItem> {
  items: TItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Parâmetros de paginação aceitos por qualquer listagem. */
export interface PaginationParams {
  page: number
  pageSize: number
}

/**
 * Branded type helper — usado para IDs que não devem ser intercambiáveis
 * entre recursos (ex.: `NftId` não deve ser aceito onde se espera `OrderId`),
 * mesmo sendo ambos `string` em runtime.
 */
export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand }
