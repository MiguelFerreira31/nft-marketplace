import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useId, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegisterMutation } from '@/features/account/hooks/useSessionQuery'
import { mapAuthError } from '@/features/account/lib/form-errors'
import { safeRedirectTarget } from '@/shared/session/safeRedirect'

interface RegisterSearch {
  /** Preservado quando o usuário chega de `/login?redirect=...` e clica em "Cadastre-se". */
  redirect?: string
}

/**
 * Cadastro (readme §3): criação de conta, validação e tratamento de
 * conflito (e-mail duplicado). Um cadastro bem-sucedido já autentica (ver
 * `RegisterResponse = Session` no contrato) — por isso também retoma
 * `search.redirect`, igual ao login.
 */
export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(name: string, email: string, password: string, confirmPassword: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!name.trim() || name.trim().length < 2) errors.name = 'Informe um nome com ao menos 2 caracteres.'
  if (!email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Informe um e-mail válido.'
  if (!password || password.length < 8) errors.password = 'A senha deve ter ao menos 8 caracteres.'
  if (confirmPassword !== password) errors.confirmPassword = 'As senhas não coincidem.'
  return errors
}

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()
  const formTitleId = useId()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const clientErrors = validate(name, email, password, confirmPassword)
    setFieldErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    registerMutation.mutate(
      { name: name.trim(), email: email.trim(), password },
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
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Credenciais fictícias — nenhum dado real é necessário.</p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível criar a conta</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate aria-labelledby={formTitleId}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-name">Nome</Label>
          <Input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
          />
          {fieldErrors.name ? (
            <p id="register-name-error" className="text-sm text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">E-mail</Label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <p id="register-email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">Senha</Label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
          />
          {fieldErrors.password ? (
            <p id="register-password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-confirm-password">Confirmar senha</Label>
          <Input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
          />
          {fieldErrors.confirmPassword ? (
            <p id="register-confirm-password-error" className="text-sm text-destructive">
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link to="/login" search={{ redirect }} className="font-medium text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
