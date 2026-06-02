/**
 * POST /api/onboarding/reprocessar-modo2
 * Regera o Modo 2 (Prep de Reunião) para um onboarding já concluído.
 * Roda de forma SÍNCRONA para garantir conclusão dentro do timeout do Vercel.
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { gerarModo2, type GerarModo2Result } from '@/lib/onboarding/geradores'

// Estende o timeout máximo para esta rota (requer Vercel Pro para >10s)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { token } = await request.json() as { token: string }

  if (!token) {
    return Response.json({ error: 'token obrigatório' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: session } = await service
    .from('onboarding_clientes')
    .select('organization_id, status')
    .eq('token', token)
    .single()

  if (!session) {
    return Response.json({ error: 'Onboarding não encontrado' }, { status: 404 })
  }

  try {
    const resultado = await gerarModo2({ token, organizationId: session.organization_id })
    return Response.json({ ...resultado })
  } catch (err) {
    return Response.json({ error: String(err), etapa: 'exception' }, { status: 500 })
  }
}
