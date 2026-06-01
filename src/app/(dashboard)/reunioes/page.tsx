import Link from 'next/link'
import { Plus, Video, Users, UserCheck, Handshake, Calendar, Lock } from 'lucide-react'
import { buscarReunioes } from './actions'
import type { TipoReuniao } from './actions'

const TIPO_CONFIG: Record<TipoReuniao, { label: string; icon: React.ReactNode; cor: string }> = {
  prospeccao:  { label: 'Prospecção',  icon: <Handshake className="h-3.5 w-3.5" />,  cor: 'bg-violet-100 text-violet-700' },
  cliente:     { label: 'Cliente',     icon: <UserCheck className="h-3.5 w-3.5" />,  cor: 'bg-blue-100 text-blue-700' },
  interna:     { label: 'Interna',     icon: <Users className="h-3.5 w-3.5" />,      cor: 'bg-zinc-100 text-zinc-600' },
  onboarding:  { label: 'Onboarding',  icon: <Video className="h-3.5 w-3.5" />,      cor: 'bg-emerald-100 text-emerald-700' },
}

export default async function ReunioesPage() {
  const reunioes = await buscarReunioes()

  const agora = new Date()
  const proximas = reunioes.filter((r) => new Date(r.data_reuniao) >= agora)
  const passadas = reunioes.filter((r) => new Date(r.data_reuniao) < agora)

  function ReuniaoCard({ r }: { r: (typeof reunioes)[0] }) {
    const cfg = TIPO_CONFIG[r.tipo]
    const data = new Date(r.data_reuniao)
    const isPast = data < agora

    return (
      <Link
        href={`/reunioes/${r.id}`}
        className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 hover:border-violet-300 hover:shadow-sm transition-all group"
      >
        {/* Data block */}
        <div className="flex-none text-center w-12">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase">
            {data.toLocaleDateString('pt-BR', { month: 'short' })}
          </p>
          <p className={`text-2xl font-bold leading-none ${isPast ? 'text-zinc-300' : 'text-zinc-900'}`}>
            {data.getDate()}
          </p>
          <p className="text-[10px] text-zinc-400">
            {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          {/* Tipo + Confidencial */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cor}`}>
              {cfg.icon}
              {cfg.label}
            </span>
            {r.confidencial && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                <Lock className="h-3 w-3" />
                Confidencial
              </span>
            )}
          </div>

          {/* Contexto */}
          <p className="mt-1 text-sm font-semibold text-zinc-800 group-hover:text-violet-700 transition-colors">
            {r.cliente_nome ?? r.prospect_nome ?? 'Reunião interna'}
          </p>

          {/* Info */}
          <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-400">
            {r.duracao_minutos && <span>{r.duracao_minutos} min</span>}
            {r.resumo_gerado ? (
              <span className="text-emerald-500 font-medium">✓ Resumo gerado</span>
            ) : r.notas_brutas ? (
              <span className="text-amber-500">Notas pendentes</span>
            ) : (
              <span>Sem notas</span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-zinc-900">Reuniões</h1>
            <p className="text-xs text-zinc-500">Registro e resumo automático com IA</p>
          </div>
        </div>

        <Link
          href="/reunioes/nova"
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Reunião
        </Link>
      </div>

      {/* Próximas */}
      {proximas.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Próximas ({proximas.length})
          </h2>
          <div className="space-y-2">
            {proximas.map((r) => <ReuniaoCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {/* Passadas */}
      {passadas.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Passadas ({passadas.length})
          </h2>
          <div className="space-y-2">
            {passadas.map((r) => <ReuniaoCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {reunioes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-zinc-200 mb-3" />
          <p className="text-zinc-500 font-medium">Nenhuma reunião registrada ainda.</p>
          <p className="text-xs text-zinc-400 mt-1">
            Registre reuniões para gerar resumos e action items com IA.
          </p>
          <Link
            href="/reunioes/nova"
            className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
          >
            <Plus className="h-4 w-4" />
            Registrar primeira reunião
          </Link>
        </div>
      )}
    </div>
  )
}
