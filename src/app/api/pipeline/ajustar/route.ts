/**
 * POST /api/pipeline/ajustar — registra o ajuste (calibra o agente p/ este
 * cliente) e regenera a etapa com o feedback.
 * Body: { clienteId, etapaKey, feedback }
 */
import { NextRequest } from 'next/server'
import { requirePapel } from '@/lib/dal'
import { solicitarAjuste } from '@/lib/onboarding/pipeline'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const profile = await requirePapel('socia', 'gestao')
  const { clienteId, marcaId, etapaKey, feedback } = await request.json() as {
    clienteId: string; marcaId: string; etapaKey: string; feedback: string
  }

  if (!clienteId || !marcaId || !etapaKey || !feedback?.trim()) {
    return Response.json({ error: 'clienteId, marcaId, etapaKey e feedback obrigatórios' }, { status: 400 })
  }

  const res = await solicitarAjuste({
    clienteId,
    organizationId: profile.organization_id,
    marcaId,
    etapaKey,
    feedback: feedback.trim(),
    avaliadoPor: profile.id,
  })
  return Response.json(res, { status: res.ok ? 200 : 500 })
}
