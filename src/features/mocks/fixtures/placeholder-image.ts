/**
 * Imagem placeholder 100% local (SVG inline em data URI) para as fixtures de
 * NFT/avatar. Decisão registrada em `ARCHITECTURE.md` (seção "Mocking —
 * Fase 2"): o Figma real não estava acessível neste ambiente (mesma
 * limitação já registrada na Fase 1 para os tokens visuais), e usar um CDN
 * de imagens externo (ex.: picsum.photos) quebraria o requisito de o build
 * de demonstração funcionar sem depender de serviços externos — então as
 * fixtures geram sua própria imagem, determinística e sem rede. Quem
 * integrar os assets reais do Figma substitui `coverImageUrl`/`avatarUrl`
 * sem tocar no formato do contrato (ainda uma `string` de URL).
 */
export function placeholderImage(seedText: string, background: string, foreground = '#ffffff'): string {
  const initials = seedText
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="${background}" />
    <text x="300" y="320" font-family="sans-serif" font-size="180" font-weight="700" fill="${foreground}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`

  // `btoa` é global em browser e em Node ≥16 (ambos os ambientes em que o
  // mock roda — ver `ARCHITECTURE.md`). Evita depender de `Buffer` (tipos de
  // Node não estão incluídos neste `tsconfig`, de propósito — ver seção 1).
  const encoded = btoa(unescape(encodeURIComponent(svg)))
  return `data:image/svg+xml;base64,${encoded}`
}
