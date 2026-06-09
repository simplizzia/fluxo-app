import { Share2, TrendingUp, Eye, Heart } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import { buscarPublicacoes, buscarResumoMetricasSociais, buscarIntegracoesSociais, buscarClientesAtivos } from './actions'
import SocialPainel from './SocialPainel'

interface Props {
  searchParams: Promise<{ social_ok?: string; social_error?: string; cliente_id?: string }>
}

export default async function SocialPage({ searchParams }: Props) {
  await requirePapel('socia')

  const params = await searchParams
  const socialOk     = params.social_ok    ?? null
  const socialError  = params.social_error ?? null
  const clienteIdOk  = params.cliente_id   ?? null

  const [publicacoes, resumo, integracoes, clientes] = await Promise.all([
    buscarPublicacoes(),
    buscarResumoMetricasSociais(),
    buscarIntegracoesSociais(),
    buscarClientesAtivos(),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        >
          <Share2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">Redes Sociais</h1>
          <p className="text-xs text-zinc-500">
            Publicações agendadas, métricas e integrações
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Publicações"
          value={resumo.totalPublicacoes}
          icon={<Share2 className="h-4 w-4" />}
          cor="brand"
        />
        <KpiCard
          label="Publicadas"
          value={resumo.publicacoesPublicadas}
          icon={<TrendingUp className="h-4 w-4" />}
          cor="green"
        />
        <KpiCard
          label="Alcance Total"
          value={resumo.alcanceTotal.toLocaleString('pt-BR')}
          icon={<Eye className="h-4 w-4" />}
          cor="blue"
        />
        <KpiCard
          label="Eng. Médio"
          value={`${resumo.engajamentoMedio.toFixed(1)}%`}
          icon={<Heart className="h-4 w-4" />}
          cor="pink"
        />
      </div>

      <SocialPainel
        publicacoes={publicacoes}
        resumo={resumo}
        integracoes={integracoes}
        clientes={clientes}
        socialOk={socialOk}
        socialError={socialError}
        clienteIdOk={clienteIdOk}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  cor,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  cor: 'brand' | 'green' | 'blue' | 'pink'
}) {
  const CORES = {
    brand: 'bg-brand-light text-brand',
    green: 'bg-green-50 text-green-600',
    blue:  'bg-blue-50 text-blue-600',
    pink:  'bg-pink-50 text-pink-600',
  }
  return (
    <div className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${CORES[cor]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  )
}
