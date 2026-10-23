import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { describeQueryError } from '../lib/api-error-message'

interface CatalogErrorStateProps {
  error: unknown
  onRetry: () => void
  title?: string
}

/**
 * Estado de falha do catálogo (readme §3/§4: "tratamento de... falhas").
 * Cobre tanto erro HTTP 4xx/5xx simulado quanto falha de conexão (sem
 * `response`, ex.: `networkDown` do painel de controle do mock).
 */
export function CatalogErrorState({ error, onRetry, title = 'Não foi possível carregar o catálogo' }: CatalogErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <AlertTriangle aria-hidden="true" className="size-10 text-destructive" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{describeQueryError(error)}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}
