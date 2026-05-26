import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Kanban, Calendar, Users, GitBranch, Settings, UserCircle, LogOut } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { actionLogout } from '@/app/(auth)/login/actions'
import type { PapelUsuario } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: PapelUsuario[]  // undefined = todos os papéis
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/board',
    label: 'Board',
    icon: Kanban,
  },
  {
    href: '/calendario',
    label: 'Calendário',
    icon: Calendar,
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: Users,
    roles: ['socia', 'gestao', 'atendimento'],
  },
  {
    href: '/pipeline',
    label: 'Pipeline',
    icon: GitBranch,
    roles: ['socia'],
  },
  {
    href: '/admin/convidar',
    label: 'Convidar usuário',
    icon: Settings,
    roles: ['socia'],
  },
]

const PAPEL_LABELS: Record<PapelUsuario, string> = {
  socia: 'Sócia',
  gestao: 'Gestão',
  atendimento: 'Atendimento',
  executor: 'Executor',
  cliente: 'Cliente',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  const itemsVisiveis = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(profile.papel),
  )

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="flex w-60 flex-none flex-col border-r border-zinc-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold text-zinc-900">Simplizzia</span>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {itemsVisiveis.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Rodapé do usuário */}
        <div className="border-t border-zinc-100 p-3">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
                {profile.nome
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-900">
                  {profile.nome.split(' ')[0]}
                </p>
                <p className="text-[10px] text-zinc-400">
                  {PAPEL_LABELS[profile.papel]}
                </p>
              </div>
            </div>

            <div className="flex gap-1">
              <Link
                href="/perfil"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
              >
                <UserCircle className="h-3.5 w-3.5" />
                Perfil
              </Link>
              <form className="flex-1">
                <button
                  formAction={actionLogout}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Conteúdo principal ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-6">{children}</div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SidebarLink — Client Component para highlight da rota ativa
// ---------------------------------------------------------------------------
// Como o layout é Server Component, usamos um pequeno wrapper client para
// verificar se a rota está ativa via usePathname().

import SidebarLinkClient from './SidebarLinkClient'

// Ícone é renderizado aqui no Server Component (retorna JSX serializable)
// e passado como children para o Client Component (que só precisa de href/label para usePathname)
function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <SidebarLinkClient href={item.href} label={item.label}>
      <Icon className="h-4 w-4 flex-none" />
    </SidebarLinkClient>
  )
}
