/**
 * POST /api/pipeline/gerar — gera (ou regera) uma etapa do pipeline de onboarding.
 * Body: { clienteId, etapaKey, inputManual? }
 * Auth: socia/gestao (cookie autenticado — protegido pelo proxy).
 */
import { NextRequest } from 'next/server'
import { requirePapel } from '@/lib/dal'
import { gerarEtapa } from '@/lib/onboarding/pipeline'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const profile = await requirePapel('socia', 'gestao')
  const { clienteId, marcaId, etapaKey, inputManual } = await request.json() as {
    clienteId: string; marcaId: string; etapaKey: string; inputManual?: string
  }

  if (!clienteId || !marcaId || !etapaKey) {
    return Response.json({ error: 'clienteId, marcaId e etapaKey obrigatórios' }, { status: 400 })
  }

  const res = await gerarEtapa({
    clienteId,
    organizationId: profile.organization_id,
    marcaId,
    etapaKey,
    inputManual,
  })
  return Response.json(res, { status: res.ok ? 200 : 500 })
}
