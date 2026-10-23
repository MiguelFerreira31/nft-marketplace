import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { NotFoundState } from '@/components/not-found-state'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
import { EditionPicker } from '@/features/catalog/components/edition-picker'
import { FavoriteButton } from '@/features/catalog/components/favorite-button'
import { NftDetailSkeleton } from '@/features/catalog/components/nft-detail-skeleton'
import { NftGallery } from '@/features/catalog/components/nft-gallery'
import { QuantityStepper } from '@/features/catalog/components/quantity-stepper'
import { useNftDetailQuery } from '@/features/catalog/hooks/useNftDetailQuery'
import { describeQueryError } from '@/features/catalog/lib/api-error-message'
import { useAddCartItemMutation } from '@/features/cart/hooks/useCartMutations'
import { getApiErrorBody } from '@/shared/api/http'
import type { Edition, EditionId, NftId } from '@/shared/types'

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
 * favoritos e compra. Suporta acesso direto por `$nftId` — quando a API
 * responde 404 `NOT_FOUND`, a página lança `notFound()` em vez de cair num
 * erro genérico.
 *
 * `notFoundComponent` é definido AQUI (na própria rota), não deixado
 * propagar para o fallback da rota raiz: um `notFoundComponent` local é
 * renderizado dentro do `<Outlet />` da raiz — ou seja, ainda dentro do
 * `AppShell` (header/nav/footer preservados). Sem isso, o `notFound()`
 * lançado durante a renderização desta rota seria capturado pelo
 * `CatchNotFound` da raiz, que envolve o `RootLayout` INTEIRO (AppShell
 * incluso) — substituindo também o header/footer (bug encontrado na
 * validação manual da Fase 4, ver `ARCHITECTURE.md` §10.4).
 */
export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: validateNftDetailSearch,
  component: NftDetailPage,
  notFoundComponent: () => (
    <NotFoundState
      title="NFT não encontrado"
      message="Este NFT não existe ou foi removido do marketplace. Confira o link ou volte ao catálogo."
    />
  ),
})

/** Edição pré-selecionada: a do deep link (se existir e ainda for válida), senão a primeira com estoque, senão a primeira de todas (caso geral esgotado). */
function pickDefaultEdition(editions: Edition[], requestedId: EditionId | undefined): Edition | undefined {
  const requested = requestedId ? editions.find((edition) => edition.id === requestedId) : undefined
  if (requested) return requested
  const available = editions.find((edition) => edition.availableQuantity > 0)
  return available ?? editions[0]
}

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: session } = useSessionQuery()
  const nftQuery = useNftDetailQuery(nftId as NftId)

  const nft = nftQuery.data
  const selectedEdition = useMemo(
    () => (nft ? pickDefaultEdition(nft.editions, search.editionId) : undefined),
    [nft, search.editionId],
  )

  // Reinicia a quantidade quando a edição selecionada muda — ajuste de
  // estado durante a renderização (padrão recomendado pelo React para
  // "resetar estado quando uma prop muda"), não um efeito: evita o
  // `set-state-in-effect` (render extra) e qualquer "flash" da quantidade
  // antiga antes do reset.
  const [quantity, setQuantity] = useState(1)
  const [lastEditionId, setLastEditionId] = useState<EditionId | undefined>(selectedEdition?.id)
  if (selectedEdition && selectedEdition.id !== lastEditionId) {
    setLastEditionId(selectedEdition.id)
    setQuantity(1)
  }

  const addToCart = useAddCartItemMutation(session?.user.id ?? 'guest')

  // Todos os hooks acima já rodaram incondicionalmente nesta renderização —
  // só a partir daqui o fluxo pode "sair" (throw/return) sem violar as
  // regras de hooks (o lançamento de `notFound()` substitui a árvore inteira
  // por `notFoundComponent`, então não há próxima renderização desta
  // instância para se preocupar com hooks "faltando").
  if (nftQuery.isError) {
    const body = getApiErrorBody(nftQuery.error)
    if (body?.code === 'NOT_FOUND') {
      throw notFound()
    }
  }

  if (nftQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <NftDetailSkeleton />
      </div>
    )
  }

  if (nftQuery.isError || !nft || !selectedEdition) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <CatalogErrorState error={nftQuery.error} onRetry={() => nftQuery.refetch()} />
      </div>
    )
  }

  function handleSelectEdition(edition: Edition) {
    // `replace: true`: trocar de edição é um refinamento da MESMA tela, não
    // uma navegação que precise empilhar no histórico (diferente dos
    // filtros do catálogo, que o gate da Task 4.1 exige restaurar via
    // voltar/avançar).
    navigate({ search: (prev) => ({ ...prev, editionId: edition.id }), replace: true })
  }

  const allSoldOut = nft.editions.every((edition) => edition.availableQuantity <= 0)
  const quantityExceedsAvailable = quantity > selectedEdition.availableQuantity
  const canAddToCart = selectedEdition.availableQuantity > 0 && !quantityExceedsAvailable && !addToCart.isPending

  function handleAddToCart() {
    if (!canAddToCart) return
    // `selectedEdition` já foi confirmado definido pelo guard de render
    // acima; o `!` aqui é só porque o TS não propaga a narrowing de uma
    // variável do escopo externo para dentro de uma função aninhada.
    addToCart.mutate(
      { editionId: selectedEdition!.id, quantity },
      {
        onError: (mutationError) => {
          const body = getApiErrorBody(mutationError)
          // Estoque mudou entre a leitura do detalhe e o clique (readme §7:
          // preço/disponibilidade podem mudar durante a navegação) —
          // refaz a leitura para a UI refletir o número real disponível.
          if (body?.code === 'CONFLICT' && body.reason === 'STOCK_UNAVAILABLE') {
            void nftQuery.refetch()
          }
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="grid gap-8 md:grid-cols-2">
        <NftGallery images={nft.galleryImageUrls} title={nft.title} />

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{nft.collection.name}</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold">{nft.title}</h1>
              <FavoriteButton nft={nft} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">por {nft.creator.name}</p>
          </div>

          <p className="text-sm text-foreground">{nft.description}</p>

          <p className="text-lg font-semibold">
            {selectedEdition.priceEth} ETH <span className="text-sm font-normal text-muted-foreground">preço unitário</span>
          </p>

          <EditionPicker editions={nft.editions} selectedEditionId={selectedEdition.id} onSelect={handleSelectEdition} />

          {allSoldOut ? (
            <p role="status" className="text-sm font-medium text-destructive">
              Todas as edições deste NFT estão esgotadas.
            </p>
          ) : (
            <QuantityStepper
              value={quantity}
              max={selectedEdition.availableQuantity}
              onChange={setQuantity}
              disabled={selectedEdition.availableQuantity <= 0}
            />
          )}

          <div className="mt-2 flex items-center gap-3">
            <Button type="button" disabled={!canAddToCart} onClick={handleAddToCart}>
              {addToCart.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
            </Button>
          </div>

          <p role="status" aria-live="polite" className="min-h-5 text-sm">
            {addToCart.isError ? (
              <span className="text-destructive">{describeQueryError(addToCart.error)}</span>
            ) : addToCart.isSuccess ? (
              <span className="text-muted-foreground">Adicionado ao carrinho.</span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
      ← Voltar ao catálogo
    </Link>
  )
}
