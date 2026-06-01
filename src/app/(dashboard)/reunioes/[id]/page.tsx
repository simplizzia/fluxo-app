import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Users, Lock } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { buscarReuniaoDetalhe, buscarClientesEProspects, buscarTiposDemanda } from '../actions'
import { ReuniaoDetalhe } from './ReuniaoDetalhe'
import type { TipoReuniao } from '../actions'

const TIPO_LABELS: Record<TipoReuniao, string> = {
  prospeccao: 'Prospecção',
  cliente: 'Cliente',
  interna: 'Interna',
  onboarding: 'Onboarding',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReuniaoPage({ params }: Props) {
  const { id } = await params

  const [profile, detalhe, { clientes }, tiposDemanda] = await Promise.all([
    getCurrentProfile(),
    buscarReuniaoDetalhe(id),
    buscarClientesEProspects(),
    buscarTiposDemanda(),
  ])

  if (!detalhe) notFound()

  const { reuniao, actionItems } = detalhe
  const data = new Date(reuniao.data_reuniao)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/reunioes" className="flex items-center gap-1.5 hover:text-zinc-800 transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Reuniões
        </Link>
        <span>/</span>
        <span className="text-zinc-800 font-medium">
          {reuniao.cliente_nome ?? reuniao.prospect_nome ?? 'Reunião interna'}
        </span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-blue-100">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                {TIPO_LABELS[reuniao.tipo]}
              </span>
              {reuniao.resumo_gerado && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  ✓ Resumo gerado
                </span>
              )}
              {reuniao.confidencial && (
                <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  <Lock className="h-3 w-3" />
                  Confidencial
                </span>
              )}
            </div>
            <h1 className="font-display text-xl font-bold text-zinc-900 mt-1">
              {reuniao.cliente_nome ?? reuniao.prospect_nome ?? 'Reunião interna'}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {data.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {' às '}
                {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {reuniao.duracao_minutos && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {reuniao.duracao_minutos} min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Participantes */}
        {reuniao.participantes_externos.length > 0 && (
          <div className="border-t border-zinc-100 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2 flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Participantes externos
            </p>
            <div className="flex flex-wrap gap-2">
              {reuniao.participantes_externos.map((ext, i) => (
                <div key={i} className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-1.5">
                  <p className="text-xs font-medium text-zinc-800">{ext.nome}</p>
                  {(ext.empresa || ext.email) && (
                    <p className="text-[10px] text-zinc-400">
                      {[ext.empresa, ext.email].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs + conteúdo — Client Component */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <ReuniaoDetalhe
          reuniao={reuniao}
          actionItems={actionItems}
          clientes={clientes}
          tiposDemanda={tiposDemanda}
          papel={profile.papel}
        />
      </div>
    </div>
  )
}
