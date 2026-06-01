import { Shield } from 'lucide-react'
import { requirePapel } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import {
  buscarAuditLog, buscarPiiScans, buscarPortabilidadeRequests,
  buscarEncerramentos, buscarResumoLgpd,
} from './actions'
import { LgpdPainel } from './LgpdPainel'

export default async function LgpdPage() {
  await requirePapel('socia')

  const supabase = await createClient()

  const [resumo, auditLog, piiScans, portabilidade, encerramentos, { data: clientesAtivos }] =
    await Promise.all([
      buscarResumoLgpd(),
      buscarAuditLog(100),
      buscarPiiScans(100),
      buscarPortabilidadeRequests(),
      buscarEncerramentos(),
      supabase.from('clientes').select('id, nome').eq('status', 'ativo').order('nome'),
    ])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <Shield className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-zinc-900">LGPD & Segurança</h1>
          <p className="text-xs text-zinc-500">
            Conformidade, audit log, PII, portabilidade e encerramentos
          </p>
        </div>
      </div>

      <LgpdPainel
        resumo={resumo}
        auditLog={auditLog}
        piiScans={piiScans}
        portabilidade={portabilidade}
        encerramentos={encerramentos}
        clientesAtivos={(clientesAtivos ?? []) as { id: string; nome: string }[]}
      />
    </div>
  )
}
