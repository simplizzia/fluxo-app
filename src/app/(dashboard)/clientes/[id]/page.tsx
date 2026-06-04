import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, BarChart2, Heart, Kanban } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { UsageBarra } from '@/components/plano/UsageBarra'
import { ScoreChip } from '@/components/cs/ScoreBadge'
import {
  buscarClienteDetalhe,
  buscarSecoesMarca,
  buscarAtivosVisuais,
  buscarMoodboard,
  buscarInsightsCliente,
} from './actions'
import MarcaTab from './MarcaTab'
import OnboardingConfig from './OnboardingConfig'
import PipelineSequencia from './PipelineSequencia'
import { buscarOnboardingConfig, buscarPipeline } from './onboarding-actions'
import { ClienteNomeEditor } from './ClienteNomeEditor'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { cliente } = await buscarClienteDetalhe(id)
  return { title: `${cliente?.nome ?? 'Cliente'} — Simplizzia` }
}

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params
  const profile = await getCurrentProfile()
  const podeEditar = profile.papel === 'socia' || profile.papel === 'gestao'

  const [
    { cliente, error },
    { secoes },
    { ativos },
    { items: moodboard },
    { insights },
    { data: onboardingConfig },
    pipeline,
  ] = await Promise.all([
    buscarClienteDetalhe(id),
    buscarSecoesMarca(id),
    buscarAtivosVisuais(id),
    buscarMoodboard(id),
    buscarInsightsCliente(id),
    buscarOnboardingConfig(id),
    buscarPipeline(id),
  ])

  if (error || !cliente) {
    return (
      <div className="space-y-4">
        <Link href="/clientes" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Link>
        <p className="text-sm text-red-600">{error ?? 'Cliente não encontrado.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/clientes"
        className="flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Clientes
      </Link>

      {/* Cabeçalho do cliente */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-brand text-xl font-bold text-white">
          {cliente.nome[0].toUpperCase()}
        </div>
        {podeEditar ? (
          <ClienteNomeEditor
            clienteId={id}
            nomeInicial={cliente.nome}
            status={cliente.status}
          />
        ) : (
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink">{cliente.nome}</h1>
            <p className="text-sm text-zinc-500 capitalize">{cliente.status}</p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ScoreChip score={cliente.scoreAtual} />
          <Link
            href={`/board?cliente=${id}`}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-600 transition hover:border-brand/30 hover:bg-brand-light hover:text-brand"
          >
            <Kanban className="h-3.5 w-3.5" />
            Ver no board
          </Link>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cliente.plano && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
              <BarChart2 className="h-3.5 w-3.5" />
              Uso do plano — {new Date().toLocaleString('pt-BR', { month: 'long' })}
            </div>
            <UsageBarra
              usados={cliente.plano.usados}
              limite={cliente.plano.limite}
              porcentagem={cliente.plano.porcentagem}
              height="sm"
            />
            {cliente.plano.dataRenovacao && (
              <p className="mt-2 text-[10px] text-zinc-400">
                Renova em {new Date(cliente.plano.dataRenovacao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Heart className="h-3.5 w-3.5" />
            Health Score
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-display text-3xl font-bold ${
              cliente.scoreAtual == null ? 'text-zinc-300'
              : cliente.scoreAtual >= 70 ? 'text-green-600'
              : cliente.scoreAtual >= 40 ? 'text-amber-600'
              : 'text-red-600'
            }`}>
              {cliente.scoreAtual ?? '—'}
            </span>
            {cliente.scoreAtual != null && (
              <span className="text-xs text-zinc-400">/ 100</span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">Universo da Marca</div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="font-display text-xl font-bold text-zinc-900">{secoes?.length ?? 0}</p>
              <p className="text-[10px] text-zinc-400">seções</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-zinc-900">{ativos?.length ?? 0}</p>
              <p className="text-[10px] text-zinc-400">ativos</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-zinc-900">{moodboard?.length ?? 0}</p>
              <p className="text-[10px] text-zinc-400">moodboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding — configuração completa para sócias/gestão */}
      {podeEditar && (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Onboarding do cliente</h2>
          <OnboardingConfig
            clienteId={id}
            config={onboardingConfig}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
          />
        </div>
      )}

      {/* Sequência de onboarding pós-kickoff, por marca (Personas → ... → Parâmetros) */}
      {podeEditar && pipeline.length > 0 && (
        <div>
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Sequência pós-kickoff</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Cada marca tem sua própria sequência. Cada etapa é gerada pela Izzi, revisada e aprovada antes da próxima — os ajustes calibram o agente para esta marca.
          </p>
          <PipelineSequencia
            clienteId={id}
            etapas={pipeline}
            marcas={(onboardingConfig?.marcas ?? []).map((m) => ({ id: m.id, nome: m.nome }))}
            podeEditar={podeEditar}
          />
        </div>
      )}

      {/* Universo da Marca */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Universo da Marca</h2>
        <MarcaTab
          clienteId={id}
          secoes={secoes ?? []}
          ativos={ativos ?? []}
          moodboard={moodboard ?? []}
          podeEditar={podeEditar}
          insights={insights ?? []}
          marcas={(onboardingConfig?.marcas ?? []).map((m) => ({ id: m.id, nome: m.nome }))}
        />
      </div>
    </div>
  )
}
