/**
 * POST /api/pipeline/continuar — emenda a etapa que foi cortada por limite de
 * tamanho, sem regenerar o que já estava escrito.
 * Body: { clienteId, marcaId, etapaKey }
 */
import { NextRequest } from 'next/server'
import { requirePapel } from '@/lib/dal'
import { continuarEtapa } from '@/lib/onboarding/pipeline'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const profile = await requirePapel('socia', 'gestao')
  const { clienteId, marcaId, etapaKey } = await request.json() as {
    clienteId: string; marcaId: string; etapaKey: string
  }

  if (!clienteId || !marcaId || !etapaKey) {
    return Response.json({ error: 'clienteId, marcaId e etapaKey obrigatórios' }, { status: 400 })
  }

  const res = await continuarEtapa({
    clienteId,
    organizationId: profile.organization_id,
    marcaId,
    etapaKey,
  })
  return Response.json(res, { status: res.ok ? 200 : 500 })
}
