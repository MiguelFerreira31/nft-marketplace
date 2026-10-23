import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CatalogPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/**
 * Paginação do catálogo (readme §3). `onPageChange` é responsabilidade do
 * chamador (`HomePage`) — só ele decide como compor a navegação (preserva os
 * demais parâmetros de busca na URL, NÃO reinicia a página dos outros
 * filtros).
 */
export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center justify-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden="true" />
        Anterior
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Página {page} de {totalPages}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
