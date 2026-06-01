import { Star } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import {
  buscarMrr, buscarDocumentos, buscarShareLinks,
  buscarColaboradores, buscarPerfisEquipe, buscarSlaCompliance,
} from './actions'
import { SociasPainel } from './SociasPainel'

export default async function SociasPage() {
  await requirePapel('socia')

  const [mrr, documentos, shareLinks, colaboradores, perfisDisponiveis, slaCompliance] = await Promise.all([
    buscarMrr(),
    buscarDocumentos(),
    buscarShareLinks(),
    buscarColaboradores(),
    buscarPerfisEquipe(),
    buscarSlaCompliance(),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg, #A046C6 0%, #F9267C 100%)' }}
        >
          <Star className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">Área das Sócias</h1>
          <p className="text-xs text-zinc-500">
            Painel executivo, documentos, links externos e mapa da equipe
          </p>
        </div>
      </div>

      <SociasPainel
        mrr={mrr}
        documentos={documentos}
        shareLinks={shareLinks}
        colaboradores={colaboradores}
        perfisDisponiveis={perfisDisponiveis}
        slaCompliance={slaCompliance}
      />
    </div>
  )
}
