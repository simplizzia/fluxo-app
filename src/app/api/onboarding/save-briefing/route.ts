/**
 * POST /api/onboarding/save-briefing
 * Salva o output do Modo 1 de uma marca após [MARCA_CONCLUIDA].
 * Também popula universo_marca com o briefing estruturado.
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { token, marcaId, output } = await request.json() as {
    token: string
    marcaId: string
    output: string
  }

  if (!token || !marcaId || !output) {
    return Response.json({ error: 'token, marcaId e output obrigatórios' }, { status: 400 })
  }

  const service = createServiceClient()

  // Valida que a marca pertence a este token
  const { data: marca, error } = await service
    .from('onboarding_marcas')
    .select('id, nome, onboarding_clientes!token(organization_id, cliente_id)')
    .eq('id', marcaId)
    .eq('token', token)
    .single()

  if (error || !marca) {
    return Response.json({ error: 'Marca não encontrada' }, { status: 404 })
  }

  // Salva briefing na tabela de marcas
  await service
    .from('onboarding_marcas')
    .update({
      status:           'done',
      briefing_output:  output,
      briefing_salvo_em: new Date().toISOString(),
    })
    .eq('id', marcaId)

  // Popula universo_marca com o briefing (visível apenas para a equipe)
  const session = marca.onboarding_clientes as unknown as { organization_id: string; cliente_id: string } | null
  if (session?.organization_id && session?.cliente_id) {
    await service
      .from('universo_marca')
      .upsert(
        {
          organization_id:      session.organization_id,
          cliente_id:           session.cliente_id,
          categoria:            'brand_system' as const,
          titulo:               `Briefing Modo 1 — ${marca.nome}`,
          conteudo:             { texto: output } as unknown as import('@/types/database').Json,
          visivel_para_cliente: false,
          gerado_por_agente:    'onboarding-modo1',
        },
        { onConflict: 'organization_id,cliente_id,categoria' },
      )
  }

  return Response.json({ ok: true })
}
