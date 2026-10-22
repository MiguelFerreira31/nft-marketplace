import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { CartSummarySkeleton } from '@/features/cart/components/cart-summary-skeleton'

/**
 * Carrinho de NFTs (readme §3): edição de quantidades, remoção, cupom e
 * resumo de valores. Não é uma rota privada — readme §3 "Conta e sessão"
 * só exige autenticação para checkout/perfil/carteiras/favoritos/pedidos, e
 * §3 "Carrinho" pede explicitamente persistir "os itens do visitante ao
 * autenticar" (ou seja, o carrinho de visitante precisa existir sem login).
 */
export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,340px)]">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Carrinho</h1>
        <p className="text-sm text-muted-foreground">
          Itens, quantidades, cupom e totais chegam na Fase 5. O resumo abaixo reserva o layout final.
        </p>
      </div>
      <aside className="rounded-xl border border-border p-4">
        <CartSummarySkeleton />
      </aside>
      <div className="lg:col-span-2">
        <Button asChild variant="outline">
          <Link to="/">Continuar explorando</Link>
        </Button>
      </div>
    </div>
  )
}
