import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * Placeholder da rota "/" (Início). As 9 telas da seção 3 do readme, busca
 * via parâmetros de URL, filtros e navegação para o NFT são escopo da Task
 * 1.1/4.1 (`agent-shell`/`agent-catalog`).
 */
export const Route = createFileRoute('/')({
  component: HomePlaceholder,
})

function HomePlaceholder() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold">NFT Marketplace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fundação (Fase 0) pronta — rotas, catálogo, carrinho e checkout chegam nas fases seguintes.
        </p>
        <Button className="mt-4" variant="outline">
          shadcn/ui ok
        </Button>
      </div>
    </main>
  )
}
