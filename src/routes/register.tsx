import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { mockSession } from '@/shared/session/mockSession'

/**
 * Cadastro (readme §3): criação de conta, validação e tratamento de
 * conflito. Formulário real é escopo da Fase 3 (`agent-auth`) — ver nota em
 * `src/routes/login.tsx` sobre o login simulado.
 */
export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()

  function handleMockRegister() {
    mockSession.login({ id: 'mock-user-1', name: 'Colecionador Demo', email: 'demo@example.com' })
    navigate({ to: '/' })
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      <p className="text-sm text-muted-foreground">
        Formulário real (nome/e-mail/senha, validação, conflito de cadastro) chega na Fase 3 (`agent-auth`).
      </p>
      <Button onClick={handleMockRegister}>Criar conta (simulado)</Button>
      <p className="text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
