import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCurrentProfile } from '@/lib/dal'
import MarcaTabSingle from './MarcaTabSingle'
import ProdutosSection from './ProdutosSection'
import PipelineSequencia from '../../PipelineSequencia'
import { buscarPipeline } from '../../onboarding-actions'
import { listarProdutos } from './produtos-actions'
import {
  buscarMarcaDetalhe,
  buscarSecoesDaMarca,
  buscarAtivosDaMarca,
  buscarMoodboardDaMarca,
  buscarInsightsDaMarca,
} from './actions'

interface Props {
  params: Promise<{ id: string; marcaId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marcaId } = await params
  const { marca } = await buscarMarcaDetalhe(marcaId)
  return { title: `${marca?.nome ?? 'Marca'} — Simplizzia` }
}

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

export default async function MarcaPage({ params }: Props) {
  const { id: clienteId, marcaId } = await params
  const profile = await getCurrentProfile()
  const podeEditar = profile.papel === 'socia' || profile.papel === 'gestao'

  const [
    { marca, error },
    { secoes },
    { ativos },
    { items: moodboard },
    { insights },
    pipeline,
    { produtos },
  ] = await Promise.all([
    buscarMarcaDetalhe(marcaId),
    buscarSecoesDaMarca(clienteId, marcaId),
    buscarAtivosDaMarca(clienteId, marcaId),
    buscarMoodboardDaMarca(clienteId, marcaId),
    buscarInsightsDaMarca(clienteId),
    buscarPipeline(clienteId),
    listarProdutos(marcaId),
  ])

  if (error || !marca) notFound()

  const nivel = marca.nivel ?? 'standalone'
  const etapasDaMarca = pipeline.filter((e) => e.marca_id === marcaId)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-zinc-500">
        <Link href="/clientes" className="hover:text-zinc-700">Clientes</Link>
        <ChevronRight className="h-3.5 w-3.5 flex-none text-zinc-300" />
        <Link href={`/clientes/${clienteId}`} className="hover:text-zinc-700">Cliente</Link>
        {marca.nivel === 'sub' && marca.marca_pai_id && (
          <>
            <ChevronRight className="h-3.5 w-3.5 flex-none text-zinc-300" />
            <Link
              href={`/clientes/${clienteId}/marcas/${marca.marca_pai_id}`}
              className="hover:text-zinc-700"
            >
              {marca.marca_pai_nome ?? 'Marca Mãe'}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 flex-none text-zinc-300" />
        <span className="font-medium text-zinc-900">{marca.nome}</span>
      </nav>

      {/* Header da marca */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-brand text-lg font-bold text-white">
          {marca.nome[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink">{marca.nome}</h1>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${NIVEL_COLOR[nivel]}`}>
              <Tag className="h-3 w-3" />
              {NIVEL_LABEL[nivel]}
            </span>
          </div>

          {/* Canais cadastrados */}
          {(marca.instagram || marca.linkedin || marca.site) && (
            <div className="mt-1 flex flex-wrap gap-3">
              {marca.instagram && (
                <span className="text-xs text-zinc-400">Instagram: {marca.instagram}</span>
              )}
              {marca.linkedin && (
                <span className="text-xs text-zinc-400">LinkedIn: {marca.linkedin}</span>
              )}
              {marca.site && (
                <a
                  href={marca.site.startsWith('http') ? marca.site : `https://${marca.site}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  {marca.site}
                </a>
              )}
            </div>
          )}
        </div>

        <Link
          href={`/clientes/${clienteId}`}
          className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar ao cliente
        </Link>
      </div>

      {/* Sub-marcas (se for marca mãe) */}
      {marca.sub_marcas.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Sub-marcas</p>
          <div className="flex flex-wrap gap-2">
            {marca.sub_marcas.map((sub) => (
              <Link
                key={sub.id}
                href={`/clientes/${clienteId}/marcas/${sub.id}`}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition hover:border-brand/30 hover:bg-brand-light hover:text-brand"
              >
                {sub.nome}
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600">B2C</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sequência de onboarding pós-kickoff desta marca (Personas → ... → Parâmetros) */}
      {podeEditar && etapasDaMarca.length > 0 && (
        <div>
          <h2 className="mb-1 font-display text-lg font-bold text-ink">Sequência pós-kickoff</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Cada etapa é gerada pela Izzi, revisada e aprovada antes da próxima — os ajustes calibram o agente para esta marca.
          </p>
          <PipelineSequencia
            clienteId={clienteId}
            etapas={etapasDaMarca}
            marcas={[{ id: marcaId, nome: marca.nome }]}
            podeEditar={podeEditar}
          />
        </div>
      )}

      {/* Produtos da marca — catálogo de SKUs que alimenta os agentes de conteúdo */}
      <ProdutosSection
        clienteId={clienteId}
        marcaId={marcaId}
        produtosIniciais={produtos ?? []}
        podeEditar={podeEditar}
      />

      {/* Conteúdo da marca — estratégia, conteúdo, identidade, moodboard, aprendizados */}
      <MarcaTabSingle
        clienteId={clienteId}
        marcaId={marcaId}
        secoes={secoes ?? []}
        ativos={ativos ?? []}
        moodboard={moodboard ?? []}
        insights={insights ?? []}
        podeEditar={podeEditar}
      />
    </div>
  )
}
