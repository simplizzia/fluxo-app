/**
 * POST /api/onboarding/status
 * Atualiza o status da sessão de onboarding.
 * Usado pelo componente Apresentacao ao ir para o chat (pending → briefing).
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { token, status } = await request.json() as {
    token: string
    status: 'pending' | 'briefing' | 'done'
  }

  if (!token || !status) {
    return Response.json({ error: 'token e status obrigatórios' }, { status: 400 })
  }

  const service = createServiceClient()

  const { error } = await service
    .from('onboarding_clientes')
    .update({ status })
    .eq('token', token)

  if (error) {
    return Response.json({ error: 'Erro ao atualizar status' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
