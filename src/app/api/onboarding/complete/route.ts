/**
 * POST /api/onboarding/complete
 * Marca o onboarding como concluído e gera o Modo 2 (Prep de Reunião).
 * maxDuration estendido para aguardar a geração pela Claude API.
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { gerarModo2 } from '@/lib/onboarding/geradores'

export const maxDuration = 60

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

  // Gera Prep de Reunião (Modo 2) — aguarda conclusão
  await gerarModo2({ token, organizationId: session.organization_id }).catch(
    (err) => console.error('[onboarding/complete] gerarModo2', err)
  )

  return Response.json({ ok: true })
}
