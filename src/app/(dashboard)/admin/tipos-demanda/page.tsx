import type { Metadata } from 'next'
import { Timer } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import { buscarTiposDemandaComSla } from './actions'
import { SlaForm } from './SlaForm'

export const metadata: Metadata = {
  title: 'SLA por Demanda — Simplizzia',
}

export default async function TiposDemandaPage() {
  await requirePapel('socia')
  const tipos = await buscarTiposDemandaComSla()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Timer className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">SLA por Demanda</h1>
          <p className="text-xs text-zinc-500">
            Configure prazos máximos por tipo. O cron monitora e notifica quando violados.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-700">
          <strong>Como funciona:</strong> Prazo de início = tempo máximo para equipe começar produção
          após o card ser criado. Prazo de resposta = tempo máximo em produção até enviar ao cliente.
          Alertas chegam via notificação in-app e e-mail para sócias e atendimento.
        </p>
      </div>

      <SlaForm tipos={tipos} />
    </div>
  )
}
