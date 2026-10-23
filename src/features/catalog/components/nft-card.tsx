import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/shared/types'
import { FavoriteButton } from './favorite-button'

interface NftCardProps {
  nft: NftSummary
}

/**
 * Card real de listagem do catálogo (Início — readme §3). Mesma proporção
 * de imagem/linhas de texto do `NftCardSkeleton` (Task 1.2) para que o
 * layout não desloque ao trocar skeleton → card real.
 *
 * Dois links separados (imagem + título) em vez de envolver o card inteiro
 * num único `<a>`: o botão de favoritar precisa ser um elemento interativo
 * próprio (não pode ficar aninhado dentro de outro link/âncora). O link da
 * imagem é decorativo para leitores de tela (`aria-hidden`/`tabIndex=-1`) —
 * o link do título já é o alvo de navegação acessível por teclado/AT.
 */
export function NftCard({ nft }: NftCardProps) {
  return (
    <article className="flex flex-col gap-3">
      <div className="relative">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="block aspect-square overflow-hidden rounded-xl bg-muted"
          tabIndex={-1}
          aria-hidden="true"
        >
          <img src={nft.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        </Link>
        <FavoriteButton nft={nft} size="icon-sm" className="absolute top-2 right-2" />
      </div>

      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="flex flex-col gap-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring">
        <h3 className="truncate text-sm font-medium text-foreground">{nft.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{nft.collection.name}</p>
      </Link>

      <p className="text-sm font-semibold text-foreground">
        A partir de {nft.priceFromEth} ETH
      </p>
    </article>
  )
}
