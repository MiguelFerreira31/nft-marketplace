import { createFileRoute } from '@tanstack/react-router'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { useWalletsQuery } from '@/features/account/hooks/useWalletsQuery'
import { requireAuth } from '@/shared/session/requireAuth'

/**
 * Carteiras (readme §3): cadastro e edição de carteiras principal e
 * secundária. Rota privada (readme §3 "Conta e sessão"). Cadastro/edição é
 * escopo da Fase 8 (`agent-account`) — esta fase (3, `agent-auth`) já lista
 * as carteiras REAIS via `useWalletsQuery` (isolada por `UserId`), mesmo
 * motivo da tela de perfil: dá um recurso autenticado concreto para validar
 * que a troca de usuário nunca mostra a carteira de outra conta.
 */
export const Route = createFileRoute('/account/wallets')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: WalletsPage,
})

function WalletsPage() {
  const { data: session } = useSessionQuery()
  const userId = session?.user.id
  const walletsQuery = useWalletsQuery(userId)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Carteiras</h1>
      <p className="text-sm text-muted-foreground">
        Cadastro/edição de carteira principal e secundária chegam na Fase 8 (`agent-account`).
      </p>

      {walletsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando carteiras…</p>
      ) : walletsQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar as carteiras agora.</p>
      ) : walletsQuery.data && walletsQuery.data.items.length > 0 ? (
        <ul className="flex max-w-sm flex-col gap-2">
          {walletsQuery.data.items.map((wallet) => (
            <li key={wallet.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{wallet.kind === 'primary' ? 'Carteira principal' : 'Carteira secundária'}</p>
              <p className="text-muted-foreground">{wallet.address}</p>
              <p className="text-muted-foreground">Rede: {wallet.network}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma carteira cadastrada ainda.</p>
      )}
    </div>
  )
}
