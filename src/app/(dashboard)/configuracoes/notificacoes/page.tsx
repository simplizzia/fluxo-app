import { ArrowLeft, Bell } from 'lucide-react'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { NotificacoesForm } from './NotificacoesForm'

export interface PreferenciaEvento {
  evento: string
  label: string
  descricao: string
  papeis: string[]   // quais papéis veem este evento
}

export const EVENTOS: PreferenciaEvento[] = [
  {
    evento: 'card_para_aprovacao',
    label: 'Card para aprovação',
    descricao: 'Quando uma demanda é enviada para aprovação do cliente',
    papeis: ['socia', 'gestao', 'atendimento', 'cliente'],
  },
  {
    evento: 'card_concluido',
    label: 'Demanda concluída',
    descricao: 'Quando uma demanda é marcada como concluída',
    papeis: ['socia', 'gestao', 'atendimento', 'cliente'],
  },
  {
    evento: 'card_necessita_ajustes',
    label: 'Ajustes solicitados',
    descricao: 'Quando o cliente solicita ajustes em uma demanda',
    papeis: ['socia', 'gestao', 'atendimento', 'executor'],
  },
  {
    evento: 'prazo_proximo',
    label: 'Prazo se aproximando',
    descricao: 'Alerta 3 dias antes do vencimento de uma demanda',
    papeis: ['socia', 'gestao', 'atendimento', 'executor'],
  },
  {
    evento: 'prazo_vencido',
    label: 'Prazo vencido',
    descricao: 'Quando uma demanda passa da data limite sem ser concluída',
    papeis: ['socia', 'gestao', 'atendimento'],
  },
  {
    evento: 'plano_80_porcento',
    label: 'Plano 80% utilizado',
    descricao: 'Quando o cliente atingiu 80% do limite de demandas do mês',
    papeis: ['socia', 'atendimento', 'cliente'],
  },
  {
    evento: 'nova_avaliacao',
    label: 'Nova avaliação NPS',
    descricao: 'Quando um cliente responde a pesquisa de satisfação',
    papeis: ['socia', 'atendimento'],
  },
  {
    evento: 'action_item_pendente',
    label: 'Action item pendente',
    descricao: 'Lembrete de itens de reunião não confirmados há mais de 2 dias',
    papeis: ['socia', 'gestao', 'atendimento'],
  },
]

export interface NotifPreference {
  evento: string
  canal_email: boolean
  canal_inapp: boolean
  digest_diario: boolean
}

export default async function NotificacoesPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('evento, canal_email, canal_inapp, digest_diario')
    .eq('usuario_id', profile.id)

  const prefsMap: Record<string, NotifPreference> = {}
  for (const p of prefs ?? []) {
    prefsMap[p.evento] = p as NotifPreference
  }

  const eventosVisiveis = EVENTOS.filter((e) => e.papeis.includes(profile.papel))
  const ehDigestElegivel = ['socia', 'gestao'].includes(profile.papel)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/perfil" className="flex items-center gap-1.5 hover:text-zinc-800 transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Meu Perfil
        </Link>
        <span>/</span>
        <span className="text-zinc-800 font-medium">Notificações</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <Bell className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">Preferências de Notificação</h1>
          <p className="text-xs text-zinc-500">Escolha como e quando ser notificado</p>
        </div>
      </div>

      <NotificacoesForm
        profileId={profile.id}
        organizationId={profile.organization_id}
        eventos={eventosVisiveis}
        prefsIniciais={prefsMap}
        ehDigestElegivel={ehDigestElegivel}
      />
    </div>
  )
}
