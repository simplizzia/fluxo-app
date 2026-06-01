import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, GitBranch } from 'lucide-react'
import { buscarProspectDetalhe } from '../actions'
import { ProspectDetalhe } from './ProspectDetalhe'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProspectPage({ params }: Props) {
  const { id } = await params
  const dados = await buscarProspectDetalhe(id)

  if (!dados) notFound()

  const { prospect, interacoes, propostas } = dados

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/pipeline" className="flex items-center gap-1.5 hover:text-violet-600 transition">
          <ArrowLeft className="h-3.5 w-3.5" />
          Pipeline
        </Link>
        <span>/</span>
        <span className="text-zinc-800 font-medium">{prospect.nome}</span>
      </div>

      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <GitBranch className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">{prospect.nome}</h1>
          {prospect.empresa && (
            <p className="text-xs text-zinc-500">{prospect.empresa}</p>
          )}
        </div>
      </div>

      <ProspectDetalhe
        prospect={prospect}
        interacoes={interacoes}
        propostas={propostas}
      />
    </div>
  )
}
