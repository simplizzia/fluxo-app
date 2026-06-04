/**
 * POST /api/pipeline/aprovar — aprova uma etapa, grava em universo_marca
 * e dispara a próxima etapa automática.
 * Body: { clienteId, etapaKey }
 */
import { NextRequest } from 'next/server'
import { requirePapel } from '@/lib/dal'
import { aprovarEtapa } from '@/lib/onboarding/pipeline'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const profile = await requirePapel('socia', 'gestao')
  const { clienteId, marcaId, etapaKey } = await request.json() as {
    clienteId: string; marcaId: string; etapaKey: string
  }

  if (!clienteId || !marcaId || !etapaKey) {
    return Response.json({ error: 'clienteId, marcaId e etapaKey obrigatórios' }, { status: 400 })
  }

  const res = await aprovarEtapa({
    clienteId,
    organizationId: profile.organization_id,
    marcaId,
    etapaKey,
    aprovadoPor: profile.id,
  })
  return Response.json(res, { status: res.ok ? 200 : 500 })
}
