import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, ArrowRight, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react'
import { buscarRelatorios, buscarRelatoriosCliente } from './actions'
import { getCurrentProfile } from '@/lib/dal'

export const metadata: Metadata = {
  title: 'Relatórios Mensais — Simplizzia',
}

export default async function RelatoriosPage() {
  const profile = await getCurrentProfile()

  const isCliente = profile.papel === 'cliente'

  const { relatorios, error } = isCliente
    ? await buscarRelatoriosCliente()
    : await buscarRelatorios()

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  const lista = relatorios ?? []

  // Agrupa por mês para a visão da equipe
  const porMes: Record<string, typeof lista> = {}
  for (const r of lista) {
    const mes = r.mesReferencia.slice(0, 7) // "2026-04"
    if (!porMes[mes]) porMes[mes] = []
    porMes[mes].push(r)
  }

  const meses = Object.keys(porMes).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <FileText className="h-6 w-6 text-brand" />
          Relatórios Mensais
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {isCliente
            ? 'Seus relatórios mensais de produtividade e performance.'
            : 'Relatórios gerados pela IA no dia 25 de cada mês. Revise, edite e envie ao cliente.'}
        </p>
      </div>

      {/* Estado vazio */}
      {lista.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">
            {isCliente
              ? 'Nenhum relatório disponível ainda.'
              : 'Nenhum relatório gerado ainda. O primeiro será criado no dia 25 do mês atual.'}
          </p>
        </div>
      )}

      {/* Visão do cliente — lista simples */}
      {isCliente && lista.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-100">
            {lista.map((r) => {
              const nomeMes = new Date(r.mesReferencia).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })
              return (
                <Link
                  key={r.id}
                  href={`/relatorios/${r.id}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize text-zinc-800">{nomeMes}</p>
                    {r.enviadoEm && (
                      <p className="text-xs text-zinc-400">
                        Enviado em {new Date(r.enviadoEm).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Visão da equipe — agrupado por mês */}
      {!isCliente &&
        meses.map((mes) => {
          const data = new Date(mes + '-01')
          const nomeMes = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          const relsMes = porMes[mes]
          const enviados = relsMes.filter((r) => r.status === 'enviado').length

          return (
            <div key={mes} className="rounded-2xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <h2 className="text-sm font-semibold capitalize text-zinc-700">{nomeMes}</h2>
                <p className="text-xs text-zinc-400">
                  {enviados}/{relsMes.length} enviados
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {relsMes.map((r) => (
                  <RelatorioRow key={r.id} relatorio={r} />
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RelatorioRow — linha na listagem da equipe
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  gerando: {
    icon: <Clock className="h-4 w-4 text-zinc-400" />,
    label: 'Gerando',
    chip: 'text-zinc-500 bg-zinc-100',
  },
  rascunho: {
    icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
    label: 'Revisar',
    chip: 'text-amber-700 bg-amber-100',
  },
  aprovado: {
    icon: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
    label: 'Pronto',
    chip: 'text-blue-700 bg-blue-100',
  },
  enviado: {
    icon: <Send className="h-4 w-4 text-green-500" />,
    label: 'Enviado',
    chip: 'text-green-700 bg-green-100',
  },
}

type RelatorioItem = {
  id: string
  clienteNome: string
  status: 'gerando' | 'rascunho' | 'aprovado' | 'enviado'
  enviadoEm: string | null
  criadoEm: string
}

function RelatorioRow({ relatorio: r }: { relatorio: RelatorioItem }) {
  const cfg = STATUS_CONFIG[r.status]
  const podeAbrir = r.status !== 'gerando'

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex-none">{cfg.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-800">{r.clienteNome}</p>
        {r.enviadoEm && (
          <p className="text-[11px] text-zinc-400">
            Enviado em {new Date(r.enviadoEm).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.chip}`}>
        {cfg.label}
      </span>
      {podeAbrir ? (
        <Link
          href={`/relatorios/${r.id}`}
          className="flex-none text-xs font-medium text-brand hover:underline"
        >
          {r.status === 'rascunho' ? 'Revisar' : 'Ver'}{' '}
          <ArrowRight className="inline h-3 w-3" />
        </Link>
      ) : (
        <span className="flex-none text-xs text-zinc-300">aguarde...</span>
      )}
    </div>
  )
}
