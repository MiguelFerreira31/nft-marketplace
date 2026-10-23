import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Estado vazio do carrinho (readme §3 "Carrinho" + §8 "estados de...
 * vazio"). Distinto do estado de carregamento (skeleton) e do estado de
 * erro — mostrado só quando a API confirma que não há nenhum item no
 * carrinho ativo (visitante ou usuário autenticado).
 */
export function CartEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <ShoppingCart aria-hidden="true" className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Seu carrinho está vazio</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Explore o catálogo e adicione NFTs para vê-los aqui.
      </p>
      <Button asChild>
        <Link to="/">Explorar catálogo</Link>
      </Button>
    </div>
  )
}
