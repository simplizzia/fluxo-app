import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, BarChart2, Heart, Kanban, Archive, Tag, ChevronRight, Layers } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { UsageBarra } from '@/components/plano/UsageBarra'
import { ScoreChip } from '@/components/cs/ScoreBadge'
import {
  buscarClienteDetalhe,
  buscarSecoesMarca,
  buscarAtivosVisuais,
  buscarMoodboard,
} from './actions'
import OnboardingConfig from './OnboardingConfig'
import DocumentosCliente from './DocumentosCliente'
import ApresentacoesSection from './ApresentacoesSection'
import { buscarOnboardingConfig, type OnboardingMarca } from './onboarding-actions'
import { actionListarApresentacoes } from './apresentacao-actions'
import { ClienteNomeEditor } from './ClienteNomeEditor'
import { ClienteAcoes } from './ClienteAcoes'

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
    { data: onboardingConfig },
    { data: apresentacoes },
  ] = await Promise.all([
    buscarClienteDetalhe(id),
    buscarSecoesMarca(id),
    buscarAtivosVisuais(id),
    buscarMoodboard(id),
    buscarOnboardingConfig(id),
    actionListarApresentacoes(id),
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
          {podeEditar && (
            <ClienteAcoes
              clienteId={id}
              nome={cliente.nome}
              arquivado={cliente.status === 'inativo'}
              podeExcluir={profile.papel === 'socia'}
            />
          )}
        </div>
      </div>

      {/* Aviso de arquivado */}
      {cliente.status === 'inativo' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <Archive className="h-4 w-4" />
          Este cliente está <strong>arquivado</strong>. Use "Restaurar" para reativá-lo.
        </div>
      )}

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

      {/* Apresentações web */}
      {podeEditar && (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Apresentações</h2>
          <ApresentacoesSection
            clienteId={id}
            apresentacoes={apresentacoes ?? []}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
          />
        </div>
      )}

      {/* Documentos de nível cliente: perfil do cliente + briefing legado */}
      {podeEditar && (secoes ?? []).some((s) => s.marcaId === null && (s.subcategoria === 'perfil_cliente' || s.subcategoria === 'prep_reuniao' || s.subcategoria === 'briefing_completo')) && (
        <div>
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Documentos do cliente</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Perfil do cliente e briefings de nível geral. Os briefings isolados por marca ficam na página de cada marca.
          </p>
          <DocumentosCliente clienteId={id} secoes={secoes ?? []} podeEditar={podeEditar} />
        </div>
      )}

      {/* Marcas — hierarquia com links para páginas individuais */}
      {(onboardingConfig?.marcas ?? []).length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Marcas</h2>
          <HierarquiaMarcas
            clienteId={id}
            marcas={onboardingConfig!.marcas}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HierarquiaMarcas — cards de marca com hierarquia e links para páginas
// ---------------------------------------------------------------------------

const NIVEL_LABEL: Record<string, string> = {
  mae:        'Marca Mãe · B2B',
  sub:        'Sub-marca · B2C',
  standalone: 'Marca',
}
const NIVEL_COLOR: Record<string, string> = {
  mae:        'bg-blue-100 text-blue-700',
  sub:        'bg-violet-100 text-violet-700',
  standalone: 'bg-zinc-100 text-zinc-600',
}

function HierarquiaMarcas({
  clienteId,
  marcas,
}: {
  clienteId: string
  marcas: OnboardingMarca[]
}) {
  // Monta mapa de filhas por marca_pai_id
  const filhasMap = new Map<string, OnboardingMarca[]>()
  for (const m of marcas) {
    if (m.nivel === 'sub' && m.marca_pai_id) {
      const lista = filhasMap.get(m.marca_pai_id) ?? []
      lista.push(m)
      filhasMap.set(m.marca_pai_id, lista)
    }
  }

  // Marcas standalone sem hierarquia definida (marca_pai_id null e nivel standalone)
  const standalone = marcas.filter((m) => m.nivel === 'standalone' && !m.marca_pai_id)
  const maes       = marcas.filter((m) => m.nivel === 'mae')

  const renderMarcaCard = (m: OnboardingMarca, destaque = false) => (
    <Link
      key={m.id}
      href={`/clientes/${clienteId}/marcas/${m.id}`}
      className={`group flex items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4 transition hover:shadow-sm ${
        destaque ? 'border-brand/20 hover:border-brand/40' : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white">
          {m.nome[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 truncate">{m.nome}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${NIVEL_COLOR[m.nivel ?? 'standalone']}`}>
              {NIVEL_LABEL[m.nivel ?? 'standalone']}
            </span>
            {m.status === 'done' && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                Onboarding concluído
              </span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 flex-none text-zinc-300 group-hover:text-zinc-500 transition" />
    </Link>
  )

  return (
    <div className="space-y-4">
      {/* Marcas mãe com suas sub-marcas */}
      {maes.map((mae) => {
        const filhas = filhasMap.get(mae.id) ?? []
        return (
          <div key={mae.id} className="space-y-2">
            {renderMarcaCard(mae, true)}
            {filhas.length > 0 && (
              <div className="ml-6 space-y-2">
                {filhas.map((f) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <div className="mt-5 flex h-4 w-4 flex-none items-center">
                      <Layers className="h-3 w-3 text-zinc-300" />
                    </div>
                    <div className="flex-1">{renderMarcaCard(f)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Marcas standalone (sem hierarquia definida) */}
      {standalone.map((m) => {
        const filhas = filhasMap.get(m.id) ?? []
        return (
          <div key={m.id} className="space-y-2">
            {renderMarcaCard(m)}
            {filhas.length > 0 && (
              <div className="ml-6 space-y-2">
                {filhas.map((f) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <div className="mt-5 flex h-4 w-4 flex-none items-center">
                      <Layers className="h-3 w-3 text-zinc-300" />
                    </div>
                    <div className="flex-1">{renderMarcaCard(f)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Fallback: sub-marcas órfãs (sem pai cadastrado) */}
      {marcas
        .filter((m) => m.nivel === 'sub' && (!m.marca_pai_id || !marcas.find((p) => p.id === m.marca_pai_id)))
        .map((m) => renderMarcaCard(m))
      }

      {marcas.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
          <Tag className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-600">Nenhuma marca cadastrada</p>
          <p className="mt-1 text-xs text-zinc-400">Configure as marcas no onboarding abaixo.</p>
        </div>
      )}
    </div>
  )
}
