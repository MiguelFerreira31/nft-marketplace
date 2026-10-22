import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/shared/session/requireAuth'
import { useMockSession } from '@/shared/session/useMockSession'

/**
 * Perfil do colecionador (readme §3): edição dos dados, avatar e alteração
 * de senha. Rota privada (readme §3 "Conta e sessão"). Também precisa
 * funcionar em mobile mesmo sem frame dedicado no Figma — o shell (`AppShell`)
 * já é responsivo por padrão.
 */
export const Route = createFileRoute('/account/profile')({
  beforeLoad: ({ location }) => requireAuth(location),
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useMockSession()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Perfil do colecionador</h1>
      <p className="text-sm text-muted-foreground">
        Edição de dados, avatar e alteração de senha chegam na Fase 8 (`agent-account`). Sessão simulada atual:{' '}
        {user?.name} ({user?.email}).
      </p>
    </div>
  )
}
