import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { mockSession } from '@/shared/session/mockSession'
import { safeRedirectTarget } from '@/shared/session/safeRedirect'

interface LoginSearch {
  /** Destino original para retomar o fluxo após autenticar (preenchido por `requireAuth`). */
  redirect?: string
}

/**
 * Login (readme §3): autenticação, validação e retorno ao fluxo anterior.
 * `search.redirect` é o contrato com `requireAuth` — qualquer rota privada
 * que redireciona para aqui preenche esse parâmetro com a URL original.
 *
 * O formulário real (validação, erros da API) é escopo da Fase 3
 * (`agent-auth`). Aqui só existe um botão de "login simulado" para provar
 * que o guard + retomada funcionam de ponta a ponta nesta fase — ver
 * `src/shared/session/mockSession.ts`.
 */
export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()

  function handleMockLogin() {
    mockSession.login({ id: 'mock-user-1', name: 'Colecionador Demo', email: 'demo@example.com' })
    navigate({ to: safeRedirectTarget(redirect) })
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="text-sm text-muted-foreground">
        Formulário real (e-mail/senha, validação, erros da API) chega na Fase 3 (`agent-auth`). Este botão simula um
        login válido só para exercitar o guard de rota privada e a retomada do fluxo{redirect ? ` para ${redirect}` : ''}.
      </p>
      <Button onClick={handleMockLogin}>Entrar (simulado)</Button>
      <p className="text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
