/**
 * POST /api/onboarding/feedback
 * Salva avaliação pós-briefing (star rating).
 * Portado de projects/onboarding/app/api/feedback/route.ts.
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const {
    token,
    clarity_score,
    time_score,
    relevance_score,
    comment,
  } = await request.json() as {
    token: string
    clarity_score: number
    time_score: number
    relevance_score: number
    comment?: string
  }

  if (!token || !clarity_score || !time_score || !relevance_score) {
    return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: session, error: sessError } = await service
    .from('onboarding_clientes')
    .select('organization_id')
    .eq('token', token)
    .single()

  if (sessError || !session) {
    return Response.json({ error: 'Sessão não encontrada' }, { status: 404 })
  }

  const { error } = await service.from('onboarding_feedback').upsert(
    {
      organization_id: session.organization_id,
      token,
      clarity_score,
      time_score,
      relevance_score,
      comment: comment || null,
    },
    { onConflict: 'token' },
  )

  if (error) {
    console.error('[onboarding/feedback]', error)
    return Response.json({ error: 'Erro ao salvar avaliação' }, { status: 500 })
  }

  return Response.json({ success: true })
}
