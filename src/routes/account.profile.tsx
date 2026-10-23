import { createFileRoute } from '@tanstack/react-router'
import { type ChangeEvent, type FormEvent, useId, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useChangePasswordMutation, useProfileQuery, useUpdateAvatarMutation, useUpdateProfileMutation } from '@/features/account/hooks/useProfileQuery'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { mapAccountError } from '@/features/account/lib/form-errors'
import { requireAuth } from '@/shared/session/requireAuth'
import { AVATAR_MIME_TYPES, MAX_AVATAR_FILE_SIZE_BYTES, PROFILE_BIO_MAX_LENGTH, PROFILE_NAME_MAX_LENGTH } from '@/shared/types'

export const Route = createFileRoute('/account/profile')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: ProfilePage,
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function focusFormField(form: HTMLFormElement, name: string) {
  window.setTimeout(() => {
    const field = form.querySelector<HTMLElement>(`[name="${name}"]`)
    field?.focus()
  }, 0)
}

function ProfilePage() {
  const { data: session, isPending: sessionPending } = useSessionQuery()
  const userId = session?.user.id
  const profileQuery = useProfileQuery(userId)
  const updateProfile = useUpdateProfileMutation()
  const updateAvatar = useUpdateAvatarMutation()
  const changePassword = useChangePasswordMutation()
  const ids = useId()
  const passwordFieldIds = {
    currentPassword: `${ids}-current-password`,
    newPassword: `${ids}-new-password`,
    confirmPassword: `${ids}-confirm-password`,
  }

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileStatus, setProfileStatus] = useState('')
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarStatus, setAvatarStatus] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordStatus, setPasswordStatus] = useState('')

  function validateProfile(name: string, email: string, bio: string) {
    const errors: Record<string, string> = {}
    if (name.trim().length < 2 || name.trim().length > PROFILE_NAME_MAX_LENGTH) {
      errors.name = `Informe um nome entre 2 e ${PROFILE_NAME_MAX_LENGTH} caracteres.`
    }
    if (!email.trim()) errors.email = 'Informe seu e-mail.'
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Informe um e-mail válido.'
    if (bio.length > PROFILE_BIO_MAX_LENGTH) errors.bio = `A biografia deve ter no máximo ${PROFILE_BIO_MAX_LENGTH} caracteres.`
    setProfileErrors(errors)
    return errors
  }

  function validateProfileField(field: 'name' | 'email' | 'bio', value: string) {
    const error =
      field === 'name'
        ? value.trim().length < 2 || value.trim().length > PROFILE_NAME_MAX_LENGTH
          ? `Informe um nome entre 2 e ${PROFILE_NAME_MAX_LENGTH} caracteres.`
          : ''
        : field === 'email'
          ? !value.trim()
            ? 'Informe seu e-mail.'
            : !EMAIL_PATTERN.test(value.trim())
              ? 'Informe um e-mail válido.'
              : ''
          : value.length > PROFILE_BIO_MAX_LENGTH
            ? `A biografia deve ter no máximo ${PROFILE_BIO_MAX_LENGTH} caracteres.`
            : ''
    setProfileErrors((current) => ({ ...current, [field]: error }))
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setProfileError(null)
    setProfileStatus('')
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '')
    const email = String(formData.get('email') ?? '')
    const bio = String(formData.get('bio') ?? '')
    const errors = validateProfile(name, email, bio)
    const firstInvalid = (['name', 'email', 'bio'] as const).find((field) => errors[field])
    if (firstInvalid) {
      focusFormField(form, firstInvalid)
      return
    }

    updateProfile.mutate(
      { name: name.trim(), email: email.trim(), bio: bio.trim() || null },
      {
        onSuccess: () => setProfileStatus('Dados do perfil atualizados.'),
        onError: (error) => {
          const mapped = mapAccountError(error)
          setProfileErrors(mapped.fieldErrors)
          setProfileError(mapped.formError)
          const firstInvalid = (['name', 'email', 'bio'] as const).find((field) => mapped.fieldErrors[field])
          if (firstInvalid) focusFormField(form, firstInvalid)
        },
      },
    )
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    setAvatarError(null)
    setAvatarStatus('')
    if (!file) return
    if (!AVATAR_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
      setAvatarError('Escolha uma imagem PNG, JPEG, WebP ou GIF.')
      return
    }
    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      setAvatarError(`A imagem deve ter no máximo ${MAX_AVATAR_FILE_SIZE_BYTES / 1_048_576} MB.`)
      return
    }

    const reader = new FileReader()
    reader.onerror = () => setAvatarError('Não foi possível ler essa imagem. Tente outro arquivo.')
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setAvatarError('Não foi possível ler essa imagem. Tente outro arquivo.')
        return
      }
      updateAvatar.mutate(
        { avatarDataUrl: reader.result },
        {
          onSuccess: () => setAvatarStatus('Avatar atualizado.'),
          onError: (error) => {
            const mapped = mapAccountError(error)
            setAvatarError(mapped.fieldErrors.avatarDataUrl ?? mapped.formError ?? 'Não foi possível atualizar o avatar.')
          },
        },
      )
    }
    reader.readAsDataURL(file)
  }

  function validatePassword() {
    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = 'Informe sua senha atual.'
    if (newPassword.length < 8) errors.newPassword = 'A nova senha deve ter ao menos 8 caracteres.'
    if (confirmPassword !== newPassword) errors.confirmPassword = 'As senhas não coincidem.'
    setPasswordErrors(errors)
    return errors
  }

  function validatePasswordField(field: 'currentPassword' | 'newPassword' | 'confirmPassword') {
    const error =
      field === 'currentPassword'
        ? currentPassword
          ? ''
          : 'Informe sua senha atual.'
        : field === 'newPassword'
          ? newPassword.length >= 8
            ? ''
            : 'A nova senha deve ter ao menos 8 caracteres.'
          : confirmPassword === newPassword
            ? ''
            : 'As senhas não coincidem.'
    setPasswordErrors((current) => ({ ...current, [field]: error }))
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPasswordError(null)
    setPasswordStatus('')
    const errors = validatePassword()
    const firstInvalid = (['currentPassword', 'newPassword', 'confirmPassword'] as const).find((field) => errors[field])
    if (firstInvalid) {
      focusFormField(form, firstInvalid)
      return
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setPasswordErrors({})
          setPasswordStatus('Senha alterada com sucesso.')
        },
        onError: (error) => {
          const mapped = mapAccountError(error)
          setPasswordErrors(mapped.fieldErrors)
          setPasswordError(mapped.formError)
          const firstInvalid = (['currentPassword', 'newPassword', 'confirmPassword'] as const).find(
            (field) => mapped.fieldErrors[field],
          )
          if (firstInvalid) focusFormField(form, firstInvalid)
        },
      },
    )
  }

  if (sessionPending || profileQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando perfil">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <CatalogErrorState
        error={profileQuery.error}
        onRetry={() => profileQuery.refetch()}
        title="Não foi possível carregar seu perfil"
      />
    )
  }

  const profile = profileQuery.data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil do colecionador</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualize seus dados e mantenha sua conta protegida.</p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Dados do perfil</h2>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={`Avatar de ${profile.name}`} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-lg font-semibold" aria-hidden="true">
                  {profile.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Label htmlFor={`${ids}-avatar`}>Avatar</Label>
              <Input
                id={`${ids}-avatar`}
                type="file"
                accept={AVATAR_MIME_TYPES.join(',')}
                className="mt-2 h-11 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-foreground"
                onChange={handleAvatarChange}
                disabled={updateAvatar.isPending}
                aria-invalid={Boolean(avatarError)}
                aria-describedby={`${ids}-avatar-help${avatarError ? ` ${ids}-avatar-error` : ''}`}
              />
              <p id={`${ids}-avatar-help`} className="mt-1 text-xs text-muted-foreground">
                PNG, JPEG, WebP ou GIF até {MAX_AVATAR_FILE_SIZE_BYTES / 1_048_576} MB. A imagem fica salva na simulação local.
              </p>
              {avatarError ? (
                <p id={`${ids}-avatar-error`} aria-live="polite" className="mt-1 text-sm text-destructive">
                  {avatarError}
                </p>
              ) : null}
              {updateAvatar.isPending ? <p role="status" className="mt-1 text-sm text-muted-foreground">Atualizando avatar…</p> : null}
              {avatarStatus ? <p role="status" aria-live="polite" className="mt-1 text-sm">{avatarStatus}</p> : null}
            </div>
          </div>

          {profileError ? (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>Não foi possível salvar seus dados</AlertTitle>
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          ) : null}

          <form key={profile.updatedAt} className="mt-5 flex flex-col gap-4" onSubmit={handleProfileSubmit} noValidate aria-label="Editar dados do perfil">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-name`}>Nome</Label>
              <Input
                id={`${ids}-name`}
                name="name"
                autoComplete="name"
                maxLength={PROFILE_NAME_MAX_LENGTH}
                className="h-11"
                defaultValue={profile.name}
                onChange={() => {
                  setProfileErrors((current) => ({ ...current, name: '' }))
                  setProfileStatus('')
                }}
                onBlur={(event) => validateProfileField('name', event.currentTarget.value)}
                aria-invalid={Boolean(profileErrors.name)}
                aria-describedby={profileErrors.name ? `${ids}-name-error` : undefined}
              />
              {profileErrors.name ? <p id={`${ids}-name-error`} aria-live="polite" className="text-sm text-destructive">{profileErrors.name}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-email`}>E-mail</Label>
              <Input
                id={`${ids}-email`}
                name="email"
                type="email"
                autoComplete="email"
                className="h-11"
                defaultValue={profile.email}
                onChange={() => {
                  setProfileErrors((current) => ({ ...current, email: '' }))
                  setProfileStatus('')
                }}
                onBlur={(event) => validateProfileField('email', event.currentTarget.value)}
                aria-invalid={Boolean(profileErrors.email)}
                aria-describedby={profileErrors.email ? `${ids}-email-error` : undefined}
              />
              {profileErrors.email ? <p id={`${ids}-email-error`} aria-live="polite" className="text-sm text-destructive">{profileErrors.email}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-bio`}>Biografia</Label>
              <textarea
                id={`${ids}-bio`}
                name="bio"
                rows={4}
                maxLength={PROFILE_BIO_MAX_LENGTH}
                defaultValue={profile.bio ?? ''}
                onChange={() => {
                  setProfileErrors((current) => ({ ...current, bio: '' }))
                  setProfileStatus('')
                }}
                onBlur={(event) => validateProfileField('bio', event.currentTarget.value)}
                className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring md:text-sm"
                aria-invalid={Boolean(profileErrors.bio)}
                aria-describedby={profileErrors.bio ? `${ids}-bio-error ${ids}-bio-help` : `${ids}-bio-help`}
              />
              {profileErrors.bio ? <p id={`${ids}-bio-error`} aria-live="polite" className="text-sm text-destructive">{profileErrors.bio}</p> : null}
              <p id={`${ids}-bio-help`} className="text-xs text-muted-foreground">
                Descreva o que você gosta de colecionar. {PROFILE_BIO_MAX_LENGTH} caracteres no máximo.
              </p>
            </div>
            <Button type="submit" className="h-11 w-full sm:w-fit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
            {profileStatus ? <p role="status" aria-live="polite" className="text-sm">{profileStatus}</p> : null}
          </form>
        </section>

        <section className="min-w-0 rounded-xl border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Alterar senha</h2>
          <p className="mt-1 text-sm text-muted-foreground">Escolha uma senha com pelo menos 8 caracteres.</p>
          {passwordError ? (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>Não foi possível alterar a senha</AlertTitle>
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          ) : null}
          <form className="mt-5 flex flex-col gap-4" onSubmit={handlePasswordSubmit} noValidate aria-label="Alterar senha">
            <PasswordField
              id={passwordFieldIds.currentPassword}
              name="currentPassword"
              label="Senha atual"
              autoComplete="current-password"
              value={currentPassword}
              error={passwordErrors.currentPassword}
              errorId={`${ids}-current-password-error`}
              onChange={(value) => {
                setCurrentPassword(value)
                setPasswordErrors((current) => ({ ...current, currentPassword: '' }))
                setPasswordStatus('')
              }}
              onBlur={() => validatePasswordField('currentPassword')}
            />
            <PasswordField
              id={passwordFieldIds.newPassword}
              name="newPassword"
              label="Nova senha"
              autoComplete="new-password"
              value={newPassword}
              error={passwordErrors.newPassword}
              errorId={`${ids}-new-password-error`}
              onChange={(value) => {
                setNewPassword(value)
                setPasswordErrors((current) => ({ ...current, newPassword: '' }))
                setPasswordStatus('')
              }}
              onBlur={() => validatePasswordField('newPassword')}
            />
            <PasswordField
              id={passwordFieldIds.confirmPassword}
              name="confirmPassword"
              label="Confirmar nova senha"
              autoComplete="new-password"
              value={confirmPassword}
              error={passwordErrors.confirmPassword}
              errorId={`${ids}-confirm-password-error`}
              onChange={(value) => {
                setConfirmPassword(value)
                setPasswordErrors((current) => ({ ...current, confirmPassword: '' }))
                setPasswordStatus('')
              }}
              onBlur={() => validatePasswordField('confirmPassword')}
            />
            <Button type="submit" className="h-11 w-full sm:w-fit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Atualizando…' : 'Atualizar senha'}
            </Button>
            {passwordStatus ? <p role="status" aria-live="polite" className="text-sm">{passwordStatus}</p> : null}
          </form>
        </section>
      </div>
    </div>
  )
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  value,
  error,
  errorId,
  onChange,
  onBlur,
}: {
  id: string
  name: string
  label: string
  autoComplete: string
  value: string
  error?: string
  errorId: string
  onChange: (value: string) => void
  onBlur: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        className="h-11"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? <p id={errorId} aria-live="polite" className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
