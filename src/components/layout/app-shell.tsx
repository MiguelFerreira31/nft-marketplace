import type { ReactNode } from 'react'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/**
 * Layout base (Task 1.1 — readme §8: funcionar em 390/768/1440px). Container
 * centralizado com largura máxima e padding responsivo; cada rota só
 * precisa cuidar do próprio conteúdo dentro de `<main>`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <SiteFooter />
    </div>
  )
}
