import { Link, useLocation } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import type { NftSummary } from '@/shared/types'
import { useToggleFavoriteMutation } from '../hooks/useToggleFavoriteMutation'

interface FavoriteButtonProps {
  nft: NftSummary
  className?: string
  size?: 'icon' | 'icon-sm'
}

/**
 * Botão de favoritar reaproveitado pelo card de listagem e pelo detalhe do
 * NFT (readme §3 "Catálogo e detalhe": "Favoritos devem persistir para o
 * usuário autenticado"). Sem sessão, é um LINK real para `/login` (navegável
 * por teclado/sem JS) preservando o destino atual em `search.redirect` — o
 * mesmo contrato que `requireAuth` usa nas rotas privadas (ver
 * `src/shared/session/requireAuth.ts`), para que o login retome exatamente
 * nesta tela e o usuário consiga favoritar de onde parou.
 *
 * Com sessão, dispara `useToggleFavoriteMutation` (otimista + rollback,
 * Fase 0) — nenhum estado de favorito é inventado aqui, só o `isFavorited`
 * que já vem do contrato (`NftSummary.isFavorited`).
 */
export function FavoriteButton({ nft, className, size = 'icon' }: FavoriteButtonProps) {
  const { data: session } = useSessionQuery()
  const location = useLocation()
  const toggleFavorite = useToggleFavoriteMutation()
  const isFavorited = Boolean(nft.isFavorited)

  if (!session) {
    return (
      <Button asChild variant="secondary" size={size} className={cn('backdrop-blur', className)}>
        <Link
          to="/login"
          search={{ redirect: location.href }}
          aria-label={`Entrar para favoritar ${nft.title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Heart aria-hidden="true" />
        </Link>
      </Button>
    )
  }

  const pending = toggleFavorite.isPending

  return (
    <div className="contents">
      <Button
        type="button"
        variant="secondary"
        size={size}
        className={cn('backdrop-blur', className)}
        aria-pressed={isFavorited}
        aria-label={isFavorited ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggleFavorite.mutate({ userId: session.user.id, nft, nextFavorited: !isFavorited })
        }}
      >
        <Heart aria-hidden="true" className={isFavorited ? 'fill-current' : undefined} />
      </Button>
      <p role="status" className="sr-only">
        {toggleFavorite.isError
          ? 'Não foi possível atualizar o favorito. O estado anterior foi restaurado.'
          : toggleFavorite.isSuccess
            ? isFavorited
              ? `${nft.title} adicionado aos favoritos.`
              : `${nft.title} removido dos favoritos.`
            : ''}
      </p>
    </div>
  )
}
