import type { HttpHandler } from 'msw'

/**
 * Handlers REST dos 8 recursos da seção 5 (sessão/conta, NFTs, favoritos,
 * carrinho, cotação, pedidos, perfil, carteiras) + fixtures + cenários de
 * rede/falha (seção 6) são escopo da Fase 2 (`agent-mocks`). Esta lista
 * fica vazia de propósito na Fase 0 — só a estrutura de pastas e o ponto de
 * extensão existem aqui.
 */
export const handlers: HttpHandler[] = []
