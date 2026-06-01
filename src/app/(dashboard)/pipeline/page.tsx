import { GitBranch } from 'lucide-react'
import { buscarProspects } from './actions'
import { PipelineBoard } from './PipelineBoard'

export default async function PipelinePage() {
  const prospects = await buscarProspects()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <GitBranch className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">Pipeline de Prospecção</h1>
          <p className="text-xs text-zinc-500">Acompanhe prospects do primeiro contato ao contrato assinado</p>
        </div>
      </div>

      <PipelineBoard prospects={prospects} />
    </div>
  )
}
