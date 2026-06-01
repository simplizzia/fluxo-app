import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Eye, Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react'
import { buscarRelatorio } from '../actions'
import { getCurrentProfile } from '@/lib/dal'
import EditarRelatorio from './EditarRelatorio'
import { buscarMetricasSociaisRelatorio } from '../../socias/social/actions'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { relatorio } = await buscarRelatorio(id)
  const nomeMes = relatorio
    ? new Date(relatorio.mesReferencia).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : 'Relatório'
  return { title: `${relatorio?.clienteNome ?? 'Relatório'} — ${nomeMes} — Simplizzia` }
}

export default async function RelatorioPage({ params }: Props) {
  const { id } = await params
  const [{ relatorio, error }, profile] = await Promise.all([
    buscarRelatorio(id),
    getCurrentProfile(),
  ])

  // Busca métricas sociais (best-effort — não bloqueia se migração pendente)
  const metricasSociais = relatorio
    ? await buscarMetricasSociaisRelatorio(relatorio.clienteId, relatorio.mesReferencia)
    : null

  if (error || !relatorio) {
    return (
      <div className="py-8 text-center text-sm text-red-600">
        {error ?? 'Relatório não encontrado.'}
      </div>
    )
  }

  // Cliente só acessa relatórios enviados via RLS — mas adicionamos guarda extra aqui
  if (profile.papel === 'cliente' && relatorio.status !== 'enviado') {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        Este relatório ainda não está disponível.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link
        href="/relatorios"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar para relatórios
      </Link>

      <EditarRelatorio relatorio={relatorio} />

      {/* Desempenho nas Redes Sociais — só se houver dados */}
      {metricasSociais && metricasSociais.totalPublicacoes > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-zinc-700">
              Desempenho nas Redes Sociais
            </h2>
            <span className="ml-auto text-xs text-zinc-400">
              {metricasSociais.totalPublicacoes} publicaç{metricasSociais.totalPublicacoes === 1 ? 'ão' : 'ões'} neste mês
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Alcance', value: metricasSociais.totalAlcance, icon: <Eye className="h-3.5 w-3.5" /> },
              { label: 'Curtidas', value: metricasSociais.totalCurtidas, icon: <Heart className="h-3.5 w-3.5" /> },
              { label: 'Comentários', value: metricasSociais.totalComentarios, icon: <MessageCircle className="h-3.5 w-3.5" /> },
              { label: 'Compart.', value: metricasSociais.totalCompartilhamentos, icon: <Repeat2 className="h-3.5 w-3.5" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                  {icon}
                  <span className="text-[10px] uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-xl font-bold text-zinc-900">
                  {value.toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>

          {metricasSociais.engajamentoMedio > 0 && (
            <p className="mt-3 text-xs text-zinc-500 text-center">
              Taxa de engajamento média:{' '}
              <span className="font-semibold text-zinc-700">
                {metricasSociais.engajamentoMedio.toFixed(2)}%
              </span>
            </p>
          )}
        </section>
      )}
    </div>
  )
}
