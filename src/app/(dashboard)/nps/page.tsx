import type { Metadata } from 'next'
import { Star, MessageSquare, Users, TrendingUp } from 'lucide-react'
import { buscarDadosNPS, buscarColaboradoresParaAvaliacao } from './actions'
import { getCurrentProfile } from '@/lib/dal'
import { NpsScore, NpsDistribuicao, NpsStars, NpsBadge } from '@/components/nps/NpsScore'
import ColaboradorForm from './ColaboradorForm'

export const metadata: Metadata = {
  title: 'NPS & Avaliações — Simplizzia',
}

export default async function NPSPage() {
  const [{ dados, error }, profile] = await Promise.all([
    buscarDadosNPS(),
    getCurrentProfile(),
  ])

  const podeAvaliarColaborador =
    profile.papel === 'socia' || profile.papel === 'gestao'

  const colaboradores = podeAvaliarColaborador
    ? (await buscarColaboradoresParaAvaliacao()).colaboradores ?? []
    : []

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  const d = dados!

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Star className="h-6 w-6 text-brand" />
          NPS &amp; Avaliações
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Net Promoter Score dos clientes e avaliações internas de colaboradores.
        </p>
      </div>

      {/* Painel principal — Score + Distribuição */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Score NPS */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-zinc-700">Score NPS geral</h2>
          <div className="flex flex-col items-center gap-4">
            <NpsScore score={d.npsGeral} total={d.totalRespostas} size="lg" />

            {d.totalRespostas > 0 && (
              <div className="flex w-full justify-around rounded-xl bg-zinc-50 px-4 py-3">
                <div className="text-center">
                  <p className="font-display text-lg font-bold text-green-600">{d.promotores}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Promotores</p>
                  <p className="text-[10px] text-zinc-300">{Math.round((d.promotores / d.totalRespostas) * 100)}%</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-bold text-amber-500">{d.neutros}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Neutros</p>
                  <p className="text-[10px] text-zinc-300">{Math.round((d.neutros / d.totalRespostas) * 100)}%</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-bold text-red-500">{d.detratores}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Detratores</p>
                  <p className="text-[10px] text-zinc-300">{Math.round((d.detratores / d.totalRespostas) * 100)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Distribuição */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold text-zinc-700">Distribuição das notas</h2>
          <NpsDistribuicao distribuicao={d.distribuicao} total={d.totalRespostas} />
        </div>
      </div>

      {/* Por cliente */}
      {d.porCliente.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <TrendingUp className="h-4 w-4 text-brand" />
              NPS por cliente
            </h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {d.porCliente.map((c) => (
              <ClienteNpsRow key={c.clienteId} cliente={c} />
            ))}
          </div>
        </div>
      )}

      {/* Avaliações recentes */}
      {d.recentes.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <MessageSquare className="h-4 w-4 text-brand" />
              Avaliações recentes
            </h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {d.recentes.map((r) => (
              <AvaliacaoRow key={r.id} avaliacao={r} />
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {d.totalRespostas === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">Nenhuma resposta recebida ainda.</p>
          <p className="mt-1 text-xs text-zinc-400">
            As avaliações são enviadas automaticamente no dia 5 de cada mês.
          </p>
        </div>
      )}

      {/* Avaliações de colaboradores */}
      {podeAvaliarColaborador && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <Users className="h-4 w-4 text-brand" />
              Avaliação de colaboradores
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Visível apenas para sócias e gestão.
            </p>
          </div>
          <div className="px-5 py-5">
            {/* Histórico de médias */}
            {colaboradores.filter((c) => c.totalAvaliacoes > 0).length > 0 && (
              <div className="mb-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Médias atuais
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {colaboradores
                    .filter((c) => c.totalAvaliacoes > 0)
                    .sort((a, b) => (b.mediaAtual ?? 0) - (a.mediaAtual ?? 0))
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">{c.nome}</p>
                          <p className="text-[10px] text-zinc-400">{c.totalAvaliacoes} avaliação{c.totalAvaliacoes !== 1 ? 'ões' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-bold text-amber-500">{c.mediaAtual}</p>
                          <p className="text-xs text-amber-400">
                            {'★'.repeat(Math.round(c.mediaAtual ?? 0))}{'☆'.repeat(5 - Math.round(c.mediaAtual ?? 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Formulário de nova avaliação */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Nova avaliação
              </p>
              <ColaboradorForm colaboradores={colaboradores} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

type ClienteNpsData = {
  clienteId: string
  clienteNome: string
  npsScore: number | null
  mediaQualidade: number | null
  mediaComunicacao: number | null
  totalRespostas: number
  ultimaResposta: string | null
}

function ClienteNpsRow({ cliente: c }: { cliente: ClienteNpsData }) {
  const scoreColor =
    c.npsScore === null ? 'text-zinc-400'
    : c.npsScore >= 50 ? 'text-green-600'
    : c.npsScore >= 0 ? 'text-amber-600'
    : 'text-red-600'

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Score */}
      <div className="w-16 shrink-0 text-center">
        <p className={`font-display text-xl font-bold ${scoreColor}`}>
          {c.npsScore === null ? '—' : c.npsScore > 0 ? `+${c.npsScore}` : `${c.npsScore}`}
        </p>
        <p className="text-[10px] text-zinc-400">NPS</p>
      </div>

      {/* Nome + métricas */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-800">{c.clienteNome}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          {c.mediaQualidade !== null && (
            <span>Qualidade: <NpsStars value={c.mediaQualidade} /></span>
          )}
          {c.mediaComunicacao !== null && (
            <span>Comunicação: <NpsStars value={c.mediaComunicacao} /></span>
          )}
        </div>
      </div>

      {/* Respostas + data */}
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-zinc-700">{c.totalRespostas} resp.</p>
        {c.ultimaResposta && (
          <p className="text-[10px] text-zinc-400">
            {new Date(c.ultimaResposta).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </p>
        )}
      </div>
    </div>
  )
}

type AvaliacaoData = {
  id: string
  clienteNome: string
  nps: number
  qualidade: number | null
  comunicacao: number | null
  comentario: string | null
  respondido_em: string
}

function AvaliacaoRow({ avaliacao: a }: { avaliacao: AvaliacaoData }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <NpsBadge nps={a.nps} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-zinc-800">{a.clienteNome}</p>
            <span className="text-[11px] text-zinc-400">·</span>
            <p className="text-[11px] text-zinc-400">
              {new Date(a.respondido_em).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
            {a.qualidade !== null && (
              <span>Qualidade: <NpsStars value={a.qualidade} /></span>
            )}
            {a.comunicacao !== null && (
              <span>Comunicação: <NpsStars value={a.comunicacao} /></span>
            )}
          </div>
          {a.comentario && (
            <p className="mt-1.5 rounded-lg bg-zinc-50 px-3 py-2 text-xs italic text-zinc-600">
              &ldquo;{a.comentario}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
