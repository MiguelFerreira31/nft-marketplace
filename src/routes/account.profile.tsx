import { createFileRoute } from '@tanstack/react-router'
import { useProfileQuery } from '@/features/account/hooks/useProfileQuery'
import { useSessionQuery } from '@/features/account/hooks/useSessionQuery'
import { requireAuth } from '@/shared/session/requireAuth'

/**
 * Perfil do colecionador (readme §3): edição dos dados, avatar e alteração
 * de senha. Rota privada (readme §3 "Conta e sessão"). A edição completa
 * (nome/avatar/senha, erros da API) é escopo da Fase 8 (`agent-account`) —
 * esta fase (3, `agent-auth`) já busca o perfil REAL via `useProfileQuery`
 * (isolado por `UserId` na query key, `shared/query/keys.ts`) para que o
 * guard/sessão real tenham algo autenticado concreto para exercitar: troque
 * de usuário (logout → login com a outra conta fictícia) e confirme que o
 * nome/e-mail exibidos aqui mudam e nunca mostram um resquício da conta
 * anterior.
 */
export const Route = createFileRoute('/account/profile')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location }),
  component: ProfilePage,
})

function ProfilePage() {
  const { data: session } = useSessionQuery()
  const userId = session?.user.id
  const profileQuery = useProfileQuery(userId)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Perfil do colecionador</h1>
      <p className="text-sm text-muted-foreground">
        Edição de dados, avatar e alteração de senha chegam na Fase 8 (`agent-account`).
      </p>

      {profileQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando perfil…</p>
      ) : profileQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar o perfil agora.</p>
      ) : profileQuery.data ? (
        <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-border p-4 text-sm">
          <dt className="font-medium text-muted-foreground">Nome</dt>
          <dd>{profileQuery.data.name}</dd>
          <dt className="font-medium text-muted-foreground">E-mail</dt>
          <dd>{profileQuery.data.email}</dd>
          <dt className="font-medium text-muted-foreground">Biografia</dt>
          <dd>{profileQuery.data.bio ?? '—'}</dd>
        </dl>
      ) : null}
    </div>
  )
}
