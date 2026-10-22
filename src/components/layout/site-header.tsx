import { Link, useNavigate } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { mockSession } from '@/shared/session/mockSession'
import { useMockSession } from '@/shared/session/useMockSession'

const navLinkClassName =
  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground'

/**
 * Shell de navegação (Task 1.1 — readme §8: desktop/tablet/mobile em
 * 1440/768/390px). Abaixo de `md` (768px) os links colapsam num painel de
 * disclosure acionado pelo botão de menu; a partir de `md` ficam sempre
 * visíveis em linha.
 *
 * O estado de sessão vem de `useMockSession` (provisório — ver
 * `src/shared/session/mockSession.ts`; a Fase 3 troca por sessão real sem
 * precisar alterar a estrutura deste componente).
 */
export function SiteHeader() {
  const { isAuthenticated, user } = useMockSession()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    mockSession.logout()
    setMobileOpen(false)
    navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="shrink-0 text-base font-semibold tracking-tight">
          NFT Marketplace
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          <Link to="/" className={navLinkClassName} activeProps={{ className: 'active' }} activeOptions={{ exact: true }}>
            Início
          </Link>
          <Link to="/cart" className={navLinkClassName} activeProps={{ className: 'active' }}>
            Carrinho
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/account/profile" className={navLinkClassName} activeProps={{ className: 'active' }}>
                Perfil
              </Link>
              <Link to="/account/wallets" className={navLinkClassName} activeProps={{ className: 'active' }}>
                Carteiras
              </Link>
            </>
          ) : null}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">{user?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Cadastrar</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      {mobileOpen ? (
        <nav id="mobile-nav" aria-label="Navegação principal (mobile)" className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          <Link to="/" className={navLinkClassName} activeProps={{ className: 'active' }} activeOptions={{ exact: true }} onClick={() => setMobileOpen(false)}>
            Início
          </Link>
          <Link to="/cart" className={navLinkClassName} activeProps={{ className: 'active' }} onClick={() => setMobileOpen(false)}>
            Carrinho
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/account/profile" className={navLinkClassName} activeProps={{ className: 'active' }} onClick={() => setMobileOpen(false)}>
                Perfil
              </Link>
              <Link to="/account/wallets" className={navLinkClassName} activeProps={{ className: 'active' }} onClick={() => setMobileOpen(false)}>
                Carteiras
              </Link>
              <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={handleLogout}>
                Sair
              </Button>
            </>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button asChild variant="ghost" size="sm" onClick={() => setMobileOpen(false)}>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm" onClick={() => setMobileOpen(false)}>
                <Link to="/register">Cadastrar</Link>
              </Button>
            </div>
          )}
        </nav>
      ) : null}
    </header>
  )
}
