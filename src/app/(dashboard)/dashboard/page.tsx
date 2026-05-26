import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Kanban } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard — Simplizzia',
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  // Contagens rápidas do board (RLS filtra automaticamente por papel)
  const { count: totalAtivos } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '(concluido,cancelado)')

  const { count: paraAprovacao } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'para_aprovacao')

  const { count: necessitaAjustes } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'necessita_ajustes')

  return (
    <div className="space-y-7">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Olá, {profile.nome.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Aqui está um resumo da operação de hoje.
        </p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Em andamento"
          value={totalAtivos ?? 0}
          description="demandas ativas no board"
          className="border-zinc-200"
        />
        <MetricCard
          label="Para aprovação"
          value={paraAprovacao ?? 0}
          description="aguardando OK do cliente"
          className={
            (paraAprovacao ?? 0) > 0 ? 'border-violet-200 bg-violet-50' : 'border-zinc-200'
          }
          valueClass={(paraAprovacao ?? 0) > 0 ? 'text-violet-700' : undefined}
        />
        <MetricCard
          label="Necessita ajustes"
          value={necessitaAjustes ?? 0}
          description="em correção pela equipe"
          className={
            (necessitaAjustes ?? 0) > 0 ? 'border-orange-200 bg-orange-50' : 'border-zinc-200'
          }
          valueClass={(necessitaAjustes ?? 0) > 0 ? 'text-orange-700' : undefined}
        />
      </div>

      {/* Atalho para o Board */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <Kanban className="h-5 w-5 text-zinc-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Board de demandas</h2>
              <p className="text-xs text-zinc-500">
                Visualize e gerencie todas as demandas em um Kanban interativo.
              </p>
            </div>
          </div>
          <Link
            href="/board"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Abrir board
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Info do perfil */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Sua conta</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Nome</dt>
            <dd className="mt-0.5 font-medium text-zinc-900">{profile.nome}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Papel</dt>
            <dd className="mt-0.5 font-medium capitalize text-zinc-900">{profile.papel}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-zinc-500">ID do perfil</dt>
            <dd className="mt-0.5 font-mono text-xs text-zinc-400">{profile.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
  className = 'border-zinc-200',
  valueClass,
}: {
  label: string
  value: number
  description: string
  className?: string
  valueClass?: string
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 ${className}`}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold text-zinc-900 ${valueClass ?? ''}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
  )
}
