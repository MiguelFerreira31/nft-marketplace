import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useId, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { useUpsertWalletMutation, useWalletsQuery } from '@/features/account/hooks/useWalletsQuery'
import { mapAccountError } from '@/features/account/lib/form-errors'
import { CatalogErrorState } from '@/features/catalog/components/catalog-error-state'
import { requireAuth } from '@/shared/session/requireAuth'
import type { NetworkId, UserId, Wallet, WalletKind } from '@/shared/types'
import { WALLET_NETWORKS } from '@/shared/types'

export const Route = createFileRoute('/account/wallets')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: WalletsPage,
})

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

function focusFormField(form: HTMLFormElement, name: string) {
  window.setTimeout(() => form.querySelector<HTMLElement>(`[name="${name}"]`)?.focus(), 0)
}

function WalletsPage() {
  const { data: session, isPending: sessionPending } = useSessionQuery()
  const userId = session?.user.id
  const walletsQuery = useWalletsQuery(userId)

  if (sessionPending || walletsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando carteiras">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (walletsQuery.isError || !walletsQuery.data) {
    return (
      <CatalogErrorState
        error={walletsQuery.error}
        onRetry={() => walletsQuery.refetch()}
        title="Não foi possível carregar suas carteiras"
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Carteiras</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cadastre uma carteira principal e, se precisar, uma secundária. Os dados são simulados e ficam salvos na sua conta local.
        </p>
      </div>
      <div className="grid min-w-0 gap-5 md:grid-cols-2">
        <WalletForm
          kind="primary"
          userId={userId as UserId}
          wallet={walletsQuery.data.items.find((wallet) => wallet.kind === 'primary')}
        />
        <WalletForm
          kind="secondary"
          userId={userId as UserId}
          wallet={walletsQuery.data.items.find((wallet) => wallet.kind === 'secondary')}
        />
      </div>
    </div>
  )
}

function WalletForm({ kind, userId, wallet }: { kind: WalletKind; userId: UserId; wallet?: Wallet }) {
  const ids = useId()
  const walletFieldIds = { label: `${ids}-label`, address: `${ids}-address`, network: `${ids}-network` }
  const upsertWallet = useUpsertWalletMutation(userId)
  const [address, setAddress] = useState(wallet?.address ?? '')
  const [network, setNetwork] = useState<NetworkId>(wallet?.network ?? WALLET_NETWORKS[0].id)
  const [label, setLabel] = useState(wallet?.label ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const title = kind === 'primary' ? 'Carteira principal' : 'Carteira secundária'

  function validateAddress() {
    const error = WALLET_ADDRESS_PATTERN.test(address.trim())
      ? ''
      : 'Informe um endereço EVM válido (0x seguido de 40 caracteres hexadecimais).'
    setFieldErrors((current) => ({ ...current, address: error }))
    return error
  }

  function validateNetwork() {
    const error = WALLET_NETWORKS.some((option) => option.id === network) ? '' : 'Selecione uma rede disponível.'
    setFieldErrors((current) => ({ ...current, network: error }))
    return error
  }

  function validateLabel() {
    const error = label.trim().length > 40 ? 'O nome da carteira deve ter até 40 caracteres.' : ''
    setFieldErrors((current) => ({ ...current, label: error }))
    return error
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setFormError(null)
    setStatus('')
    const errors = { address: validateAddress(), network: validateNetwork(), label: validateLabel() }
    const firstInvalid = (['address', 'network', 'label'] as const).find((field) => errors[field])
    if (firstInvalid) {
      focusFormField(form, firstInvalid)
      return
    }

    upsertWallet.mutate(
      { kind, address: address.trim(), network, label: label.trim() || null },
      {
        onSuccess: () => setStatus(`${title} salva com sucesso.`),
        onError: (error) => {
          const mapped = mapAccountError(error)
          setFieldErrors(mapped.fieldErrors)
          setFormError(mapped.formError)
          const firstInvalid = (['address', 'network', 'label'] as const).find((field) => mapped.fieldErrors[field])
          if (firstInvalid) focusFormField(form, firstInvalid)
        },
      },
    )
  }

  return (
    <section className="min-w-0 rounded-xl border border-border p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {wallet ? 'Edite os dados cadastrados.' : 'Nenhuma carteira cadastrada neste espaço.'}
          </p>
        </div>
        {wallet ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Cadastrada
          </span>
        ) : null}
      </div>

      {formError ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>Não foi possível salvar a carteira</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate aria-label={`${title}: cadastro e edição`}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-label`}>Nome para identificar (opcional)</Label>
          <Input
            id={walletFieldIds.label}
            name="label"
            autoComplete="off"
            className="h-11"
            maxLength={40}
            value={label}
            onChange={(event) => {
              setLabel(event.target.value)
              setFieldErrors((current) => ({ ...current, label: '' }))
              setStatus('')
            }}
            onBlur={validateLabel}
            aria-invalid={Boolean(fieldErrors.label)}
            aria-describedby={fieldErrors.label ? `${ids}-label-error` : undefined}
          />
          {fieldErrors.label ? <p id={`${ids}-label-error`} aria-live="polite" className="text-sm text-destructive">{fieldErrors.label}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-address`}>Endereço da carteira</Label>
          <Input
            id={walletFieldIds.address}
            name="address"
            autoComplete="off"
            spellCheck={false}
            className="h-11 font-mono text-sm"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value)
              setFieldErrors((current) => ({ ...current, address: '' }))
              setStatus('')
            }}
            onBlur={validateAddress}
            aria-invalid={Boolean(fieldErrors.address)}
            aria-describedby={fieldErrors.address ? `${ids}-address-error` : `${ids}-address-help`}
          />
          {fieldErrors.address ? (
            <p id={`${ids}-address-error`} aria-live="polite" className="text-sm text-destructive">{fieldErrors.address}</p>
          ) : (
            <p id={`${ids}-address-help`} className="text-xs text-muted-foreground">Informe 0x seguido de 40 caracteres hexadecimais.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-network`}>Rede</Label>
          <select
            id={walletFieldIds.network}
            name="network"
            value={network}
            onChange={(event) => {
              setNetwork(event.target.value)
              setFieldErrors((current) => ({ ...current, network: '' }))
              setStatus('')
            }}
            onBlur={validateNetwork}
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring md:text-sm"
            aria-invalid={Boolean(fieldErrors.network)}
            aria-describedby={fieldErrors.network ? `${ids}-network-error` : undefined}
          >
            {wallet?.network && !WALLET_NETWORKS.some(({ id }) => id === wallet.network) ? (
              <option value={wallet.network}>{wallet.network}</option>
            ) : null}
            {WALLET_NETWORKS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          {fieldErrors.network ? <p id={`${ids}-network-error`} aria-live="polite" className="text-sm text-destructive">{fieldErrors.network}</p> : null}
        </div>
        <Button type="submit" className="h-11 w-full sm:w-fit" disabled={upsertWallet.isPending}>
          {upsertWallet.isPending ? 'Salvando…' : wallet ? 'Salvar carteira' : 'Cadastrar carteira'}
        </Button>
        {status ? <p role="status" aria-live="polite" className="text-sm">{status}</p> : null}
      </form>
    </section>
  )
}
