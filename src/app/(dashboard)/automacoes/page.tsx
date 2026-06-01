import type { Metadata } from 'next'
import { Zap, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { buscarRegras, buscarLogs } from './actions'
import RegraToggle from './RegraToggle'

export const metadata: Metadata = {
  title: 'Motor de Automação — Simplizzia',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Ícone / cor por gatilho
function BadgeGatilho({ gatilho }: { gatilho: string }) {
  const map: Record<string, { label: string; color: string }> = {
    aguardando_info_48h:     { label: 'Cron 6h', color: 'bg-blue-100 text-blue-700' },
    em_andamento_72h:        { label: 'Cron 6h', color: 'bg-blue-100 text-blue-700' },
    para_aprovacao_email:    { label: 'Ação', color: 'bg-purple-100 text-purple-700' },
    cliente_aprova:          { label: 'Ação', color: 'bg-purple-100 text-purple-700' },
    cliente_reprova:         { label: 'Ação', color: 'bg-purple-100 text-purple-700' },
    necessita_ajustes_24h:   { label: 'Cron 6h', color: 'bg-blue-100 text-blue-700' },
    plano_80_pct:            { label: 'Cron diário', color: 'bg-amber-100 text-amber-700' },
    plano_100_pct:           { label: 'Cron diário', color: 'bg-amber-100 text-amber-700' },
    relatorio_mensal_dia25:  { label: 'Cron mensal', color: 'bg-green-100 text-green-700' },
    contrato_expirando_30d:  { label: 'Cron diário', color: 'bg-amber-100 text-amber-700' },
    nps_mensal:              { label: 'Cron mensal', color: 'bg-green-100 text-green-700' },
  }
  const { label, color } = map[gatilho] ?? { label: gatilho, color: 'bg-zinc-100 text-zinc-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AutomacoesPage() {
  const perfil = await getCurrentProfile()
  const isSocia = perfil.papel === 'socia'

  const [{ regras, error: errRegras }, { logs, error: errLogs }] = await Promise.all([
    buscarRegras(),
    buscarLogs(),
  ])

  const listaRegras = regras ?? []
  const listaLogs = logs ?? []

  const ativas = listaRegras.filter((r) => r.ativa).length

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Zap className="h-6 w-6 text-brand" />
          Motor de Automação
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {ativas} de {listaRegras.length} regras ativas · cada regra pode ser ativada ou desativada individualmente
          {!isSocia && ' · somente sócias podem alterar'}
        </p>
      </div>

      {/* ── Regras ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Regras ({listaRegras.length})
        </h2>

        {errRegras ? (
          <p className="text-sm text-red-600">{errRegras}</p>
        ) : listaRegras.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
            <p className="text-sm text-zinc-400">Nenhuma regra encontrada. Execute a migration de seed.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {listaRegras.map((regra, i) => (
              <div key={regra.id} className="flex items-start gap-4 px-5 py-4">
                {/* Número */}
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-500">
                  {i + 1}
                </span>

                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${regra.ativa ? 'text-ink' : 'text-zinc-400'}`}>
                      {regra.nome}
                    </span>
                    <BadgeGatilho gatilho={regra.gatilho} />
                  </div>
                  {regra.descricao && (
                    <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">
                      {regra.descricao}
                    </p>
                  )}
                </div>

                {/* Toggle */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <RegraToggle regraId={regra.id} ativa={regra.ativa} isSocia={isSocia} />
                  <span className={`text-[10px] font-medium ${regra.ativa ? 'text-green-600' : 'text-zinc-400'}`}>
                    {regra.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Logs recentes ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Execuções recentes
        </h2>

        {errLogs ? (
          <p className="text-sm text-red-600">{errLogs}</p>
        ) : listaLogs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
            <p className="text-sm text-zinc-400">Nenhuma execução registrada ainda.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Regra</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Entidade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Detalhes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Executado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {listaLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {log.sucesso ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-zinc-800">{log.regra?.nome ?? '—'}</span>
                        <br />
                        <span className="text-[11px] text-zinc-400 font-mono">{log.regra?.gatilho}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <span className="capitalize">{log.entidade}</span>
                        <br />
                        <span className="font-mono text-[11px] text-zinc-400">
                          {log.entidade_id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="truncate text-xs text-zinc-500 font-mono">
                          {Object.entries(log.detalhes)
                            .slice(0, 3)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(' · ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatarData(log.executado_em)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Nota informativa */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong className="text-zinc-700">Regras baseadas em ação</strong> (aprovação, reprovação, envio para aprovação)
          são disparadas diretamente pelo usuário e respeitam o toggle conceitualmente.
          &nbsp;·&nbsp;
          <strong className="text-zinc-700">Regras de cron</strong> verificam o toggle antes de cada execução.
          &nbsp;·&nbsp;
          Logs são registrados por até 90 dias.
        </p>
      </div>
    </div>
  )
}
