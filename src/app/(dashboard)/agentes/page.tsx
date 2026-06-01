import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { AGENTES, agentesPorTime } from '@/lib/agents/catalog'
import { buscarRunsRecentes, buscarClientesAtivos, buscarInsights } from './actions'
import AgentesPortal from './AgentesPortal'

export const metadata: Metadata = {
  title: 'Agentes de IA — Simplizzia',
}

export default async function AgentesPage() {
  const profile = await getCurrentProfile()

  const [{ runs }, { clientes }, { insights }] = await Promise.all([
    buscarRunsRecentes(),
    buscarClientesAtivos(),
    buscarInsights(),
  ])

  // Build agent groups for the current user's role
  const grupos = Array.from(agentesPorTime().entries())

  const totalAgentes = AGENTES.length
  const agentesManuais = AGENTES.filter((a) => a.padrao === 'C').length
  const agentesCard = AGENTES.filter((a) => a.padrao === 'A').length
  const agentesAgendados = AGENTES.filter((a) => a.padrao === 'B').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Agentes de IA</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Portal de acesso aos {totalAgentes} agentes da Simplizzia.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500">Total</p>
          <p className="mt-1 font-display text-2xl font-bold text-zinc-900">{totalAgentes}</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">agentes</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-600">Automático</p>
          <p className="mt-1 font-display text-2xl font-bold text-blue-800">{agentesCard}</p>
          <p className="mt-0.5 text-[11px] text-blue-400">acionados por card</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-600">Agendado</p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-800">{agentesAgendados}</p>
          <p className="mt-0.5 text-[11px] text-amber-400">rodam em cron</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-xs font-medium text-violet-600">Manual</p>
          <p className="mt-1 font-display text-2xl font-bold text-violet-800">{agentesManuais}</p>
          <p className="mt-0.5 text-[11px] text-violet-400">acionados pela equipe</p>
        </div>
      </div>

      {/* Info callout */}
      <div className="flex gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 flex-none text-violet-500" />
        <div className="text-xs text-zinc-600 leading-relaxed">
          <strong className="font-semibold">Como funciona:</strong>
          {' '}Agentes <span className="font-medium text-blue-700">Automáticos (A)</span> são acionados ao criar um card do tipo correspondente.
          {' '}Agentes <span className="font-medium text-amber-700">Agendados (B)</span> rodam via cron e geram inteligência periódica.
          {' '}Agentes <span className="font-medium text-violet-700">Manuais (C)</span> podem ser acionados aqui com inputs livres.
          {' '}Selecionar um cliente enriquece o contexto com brand system e personas.
        </div>
      </div>

      <AgentesPortal
        agentesPorTime={grupos}
        runs={runs}
        clientes={clientes}
        papelAtual={profile.papel}
        insightsIniciais={insights}
      />
    </div>
  )
}
