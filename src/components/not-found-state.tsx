import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

interface NotFoundStateProps {
  title?: string
  message?: string
}

/**
 * Conteúdo visual de "404" — reaproveitado por:
 * - `src/routes/__root.tsx` (`notFoundComponent` da raiz): rota inexistente
 *   (nenhuma rota do router casa com o caminho).
 * - `src/routes/nfts.$nftId.tsx` (`notFoundComponent` LOCAL da rota):
 *   `throw notFound()` quando a API responde 404 para um `nftId` específico.
 *
 * Extraído para um componente único por dois motivos: (1) readme §1 — "Estados
 * não desenhados devem seguir o mesmo padrão visual"; um 404 de recurso
 * específico não pode parecer uma tela diferente de um 404 de rota; (2) um
 * `notFoundComponent` definido NA PRÓPRIA rota filha (em vez de deixar o erro
 * propagar para o da raiz) é renderizado DENTRO do `<Outlet />` — ou seja,
 * ainda dentro do `AppShell` (header/nav/footer preservados). Deixar o erro
 * escapar para o `notFoundComponent` da raiz faz o `CatchNotFound` capturá-lo
 * ENVOLVENDO o próprio `RootLayout` (que contém o `AppShell`), substituindo a
 * árvore inteira — é por isso que o 404 de NFT específico NÃO pode depender
 * só do fallback da raiz (bug corrigido na Fase 4, ver `ARCHITECTURE.md`).
 */
export function NotFoundState({
  title = 'Página não encontrada',
  message = 'O endereço acessado não corresponde a nenhuma tela do marketplace. Confira a URL ou volte ao início.',
}: NotFoundStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
