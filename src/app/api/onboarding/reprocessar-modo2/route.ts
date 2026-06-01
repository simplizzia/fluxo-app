/**
 * POST /api/onboarding/reprocessar-modo2
 * Regera o Modo 2 (Prep de Reunião) para um onboarding já concluído.
 * Uso: quando o [ONBOARDING_COMPLETO] foi detectado mas gerarModo2 falhou.
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
  const { data: session } = await service
    .from('onboarding_clientes')
    .select('organization_id, status')
    .eq('token', token)
    .single()

  if (!session) {
    return Response.json({ error: 'Onboarding não encontrado' }, { status: 404 })
  }

  void gerarModo2({ token, organizationId: session.organization_id }).catch(
    (err) => console.error('[reprocessar-modo2]', err)
  )

  return Response.json({ ok: true, message: 'Gerando Modo 2 em background...' })
}
