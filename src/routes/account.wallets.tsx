import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/shared/session/requireAuth'

/**
 * Carteiras (readme §3): cadastro e edição de carteiras principal e
 * secundária. Rota privada (readme §3 "Conta e sessão"). Deve funcionar em
 * mobile mesmo sem frame específico no Figma (readme §3), seguindo o mesmo
 * padrão visual das demais telas — garantido pelo `AppShell` responsivo.
 */
export const Route = createFileRoute('/account/wallets')({
  beforeLoad: ({ location }) => requireAuth(location),
  component: WalletsPage,
})

function WalletsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Carteiras</h1>
      <p className="text-sm text-muted-foreground">
        Cadastro/edição de carteira principal e secundária chegam na Fase 8 (`agent-account`).
      </p>
    </div>
  )
}
