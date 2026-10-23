import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useId, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoginMutation } from '@/features/account/hooks/useSessionQuery'
import { mapAuthError } from '@/features/account/lib/form-errors'
import { safeRedirectTarget } from '@/shared/session/safeRedirect'

interface LoginSearch {
  /** Destino original para retomar o fluxo após autenticar (preenchido por `requireAuth`, ou herdado de `/register`). */
  redirect?: string
}

/**
 * Login (readme §3): autenticação, validação e retorno ao fluxo anterior.
 * `search.redirect` é o contrato com `requireAuth` — qualquer rota privada
 * que redireciona para aqui preenche esse parâmetro com a URL original.
 */
export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Informe um e-mail válido.'
  if (!password) errors.password = 'Informe sua senha.'
  return errors
}

function LoginPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const formTitleId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const clientErrors = validate(email, password)
    setFieldErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          navigate({ to: safeRedirectTarget(redirect) })
        },
        onError: (error) => {
          const mapped = mapAuthError(error)
          setFieldErrors(mapped.fieldErrors)
          setFormError(mapped.formError)
        },
      },
    )
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 id={formTitleId} className="text-2xl font-semibold">
          Entrar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use uma das contas fictícias do marketplace{redirect ? ` para continuar em ${redirect}` : ''}.
        </p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível entrar</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate aria-labelledby={formTitleId}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <p id="login-email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          />
          {fieldErrors.password ? (
            <p id="login-password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link to="/register" search={{ redirect }} className="font-medium text-foreground underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
