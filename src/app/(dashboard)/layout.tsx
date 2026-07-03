import Link from 'next/link'
import { UserCircle, LogOut } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { actionLogout } from '@/app/(auth)/login/actions'
import type { PapelUsuario } from '@/types/database'
import { IzziChatWidget } from '@/components/izzi/IzziChatWidget'
import { IzziEquipeTrigger } from '@/components/izzi/IzziEquipeTrigger'
import { IzziOnboarding } from '@/components/izzi/IzziOnboarding'
import { BuscaGlobal } from '@/components/shared/BuscaGlobal'
import { NotificationCenter } from '@/components/shared/NotificationCenter'
import { AvisoPopupModal } from '@/components/pessoas/AvisoPopupModal'
import { SidebarNav } from './SidebarNav'
import { DashboardShell } from './DashboardShell'
import type { NavItem, NavGroup, IconKey } from './SidebarNav'

// Definição interna com roles (filtradas no Server Component antes de passar ao Client)
interface NavItemDef { href: string; label: string; iconKey: IconKey; roles?: PapelUsuario[] }
interface NavGroupDef { label?: string; roles?: PapelUsuario[]; items: NavItemDef[] }

const NAV_GROUPS: NavGroupDef[] = [
  // ── Core ────────────────────────────────────────────────────────
  {
    label: 'Operação',
    items: [
      { href: '/dashboard',  label: 'Dashboard',  iconKey: 'LayoutDashboard' },
      { href: '/board',      label: 'Board',      iconKey: 'Kanban'          },
      { href: '/calendario', label: 'Calendário', iconKey: 'Calendar',
        roles: ['socia', 'gestao', 'atendimento', 'executor'] },
      { href: '/imagens',    label: 'Imagens IA', iconKey: 'Image',
        roles: ['socia', 'gestao', 'atendimento', 'executor'] },
    ],
  },

  // ── Clientes (equipe) ────────────────────────────────────────────
  {
    label: 'Clientes',
    roles: ['socia', 'gestao', 'atendimento'],
    items: [
      { href: '/clientes', label: 'Clientes',        iconKey: 'Users'    },
      { href: '/reunioes', label: 'Reuniões',         iconKey: 'Calendar' },
      { href: '/cs',       label: 'Customer Success', iconKey: 'Heart',
        roles: ['socia', 'atendimento'] },
      { href: '/nps',      label: 'NPS & Avaliações', iconKey: 'Star',
        roles: ['socia', 'atendimento'] },
    ],
  },

  // ── Minha conta (cliente) ────────────────────────────────────────
  {
    label: 'Minha conta',
    roles: ['cliente'],
    items: [
      { href: '/plano',     label: 'Uso do Plano', iconKey: 'BarChart2' },
      { href: '/relatorios',label: 'Relatórios',   iconKey: 'FileText'  },
      { href: '/marca',     label: 'Minha Marca',  iconKey: 'Palette'   },
    ],
  },

  // ── Dados (equipe) ───────────────────────────────────────────────
  {
    label: 'Dados',
    roles: ['socia', 'atendimento'],
    items: [
      { href: '/relatorios', label: 'Relatórios',   iconKey: 'FileText'  },
      { href: '/plano',      label: 'Uso do Plano', iconKey: 'BarChart2' },
    ],
  },

  // ── Inteligência ─────────────────────────────────────────────────
  {
    label: 'Inteligência',
    roles: ['socia', 'gestao', 'atendimento'],
    items: [
      { href: '/agentes',    label: 'Agentes de IA', iconKey: 'Bot' },
      { href: '/automacoes', label: 'Automações',    iconKey: 'Zap',
        roles: ['socia'] },
    ],
  },

  // ── Comercial ────────────────────────────────────────────────────
  {
    label: 'Comercial',
    roles: ['socia'],
    items: [
      { href: '/pipeline', label: 'Pipeline CRM', iconKey: 'GitBranch' },
    ],
  },

  // ── Gestão interna ───────────────────────────────────────────────
  {
    label: 'Gestão',
    roles: ['socia'],
    items: [
      { href: '/socias',              label: 'Área das Sócias',   iconKey: 'Star'       },
      { href: '/socias/pessoas',      label: 'Pessoas & Cultura', iconKey: 'Users'      },
      { href: '/socias/financeiro',   label: 'Financeiro',        iconKey: 'DollarSign' },
      { href: '/socias/social',       label: 'Redes Sociais',     iconKey: 'Share2'     },
      { href: '/socias/gamificacao',  label: 'Gamificação',       iconKey: 'Trophy'     },
      { href: '/lgpd',                label: 'LGPD & Segurança', iconKey: 'Shield'     },
      { href: '/admin/tipos-demanda', label: 'SLA por Demanda', iconKey: 'Zap'     },
      { href: '/admin/usuarios',      label: 'Usuários',         iconKey: 'Settings' },
    ],
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
  const ehCliente = profile.papel === 'cliente'
  const ehEquipe = !ehCliente

  // Para o painel da Izzi (equipe): lista de clientes ativos como opções de contexto
  let clientesParaIzzi: { id: string; nome: string }[] = []
  if (ehEquipe) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'ativo')
      .order('nome')
      .limit(50)
    clientesParaIzzi = (data ?? []) as { id: string; nome: string }[]
  }

  // Filtra grupos e itens pelo papel — só dados serializáveis chegam ao Client Component
  const gruposVisiveis: NavGroup[] = NAV_GROUPS
    .filter((g) => !g.roles || g.roles.includes(profile.papel))
    .map((g) => ({
      label: g.label,
      items: g.items
        .filter((item) => !item.roles || item.roles.includes(profile.papel))
        .map(({ href, label, iconKey }) => ({ href, label, iconKey }) satisfies NavItem),
    }))
    .filter((g) => g.items.length > 0)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-5">
          <div
            className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-sm font-bold text-white bg-gradient-brand"
          >
            S
          </div>
          <span className="font-display text-sm font-bold text-ink">Simplizzia</span>
        </div>

        {/* Navegação com grupos recolhíveis */}
        <SidebarNav grupos={gruposVisiveis} />

        {/* Bloco da Izzi — interativo para equipe, estático para clientes */}
        {ehEquipe ? (
          <IzziEquipeTrigger clientes={clientesParaIzzi} />
        ) : (
          <div className="border-t border-zinc-100 px-3 py-2">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div
                className="flex h-8 w-8 flex-none items-center justify-center rounded-xl font-display font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
              >
                I
              </div>
              <div className="min-w-0">
                <p className="font-display text-xs font-semibold text-zinc-800">Izzi</p>
                <p className="text-[10px] text-zinc-400">Use o ✨ para me chamar</p>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé do usuário */}
        <div className="border-t border-zinc-100 p-3">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 ring-2 ring-brand/20 ring-offset-1">
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
    </>
  )

  return (
    <>
      <DashboardShell
        sidebar={sidebarContent}
        headerContent={
          <>
            <BuscaGlobal />
            <NotificationCenter
              profileId={profile.id}
              organizationId={profile.organization_id}
            />
          </>
        }
      >
        {children}
      </DashboardShell>

      {/* ── Izzi — floating widget apenas para clientes ─────────── */}
      {ehCliente && <IzziChatWidget />}

      {/* ── Izzi — onboarding guiado para clientes novos ────────── */}
      {ehCliente && !profile.onboarding_concluido && <IzziOnboarding />}

      {/* ── Avisos em popup para equipe (não clientes) ───────────── */}
      {ehEquipe && (
        <AvisoPopupModal
          organizationId={profile.organization_id}
        />
      )}
    </>
  )
}

