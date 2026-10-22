import { createFileRoute, Link } from '@tanstack/react-router'
import { NftDetailSkeleton } from '@/features/catalog/components/nft-detail-skeleton'
import type { EditionId } from '@/shared/types'

interface NftDetailSearch {
  /** Edição pré-selecionada via deep link (ex.: card de uma edição específica no catálogo). */
  editionId?: EditionId
}

function validateNftDetailSearch(search: Record<string, unknown>): NftDetailSearch {
  return {
    editionId: typeof search.editionId === 'string' ? (search.editionId as EditionId) : undefined,
  }
}

/**
 * Detalhes do NFT (readme §3): galeria, informações, edição, quantidade,
 * favoritos e compra. Suporta acesso direto por `$nftId` (readme §3
 * "Catálogo e detalhe": "o detalhe deve suportar acesso direto, NFT
 * inexistente..."). A Fase 4 (`agent-catalog`) troca este skeleton por
 * `useNftDetailQuery(nftId)` e lança `notFound()` quando a API responder
 * 404 — o fallback já existe em `src/routes/__root.tsx`.
 */
export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: validateNftDetailSearch,
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()

  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Voltar ao catálogo
      </Link>
      <p className="text-sm text-muted-foreground">
        Detalhe do NFT <code className="rounded bg-muted px-1 py-0.5 text-xs">{nftId}</code> — galeria, edição,
        quantidade, favoritos e compra chegam na Fase 4.
      </p>
      <NftDetailSkeleton />
    </div>
  )
}
