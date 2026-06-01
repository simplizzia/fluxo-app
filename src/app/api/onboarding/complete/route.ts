/**
 * POST /api/onboarding/complete
 * Marca o onboarding como concluído após [ONBOARDING_COMPLETO].
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { gerarModo2 } from '@/lib/onboarding/geradores'

export async function POST(request: NextRequest) {
  const { token } = await request.json() as { token: string }

  if (!token) {
    return Response.json({ error: 'token obrigatório' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: session, error } = await service
    .from('onboarding_clientes')
    .update({
      status:     'done',
      finished_at: new Date().toISOString(),
    })
    .eq('token', token)
    .select('organization_id')
    .single()

  if (error) {
    console.error('[onboarding/complete]', error)
    return Response.json({ error: 'Erro ao finalizar' }, { status: 500 })
  }

  // Gera Prep de Reunião (Modo 2) em background — não bloqueia o cliente
  void gerarModo2({ token, organizationId: session.organization_id }).catch(
    (err) => console.error('[onboarding/complete] gerarModo2', err)
  )

  return Response.json({ ok: true })
}
