/**
 * POST /api/onboarding/reprocessar-modo3
 * Regera o Modo 3 (Briefing Completo) a partir de uma transcrição já existente.
 * Body: { clienteId, transcricao? }  — se transcricao não vier, usa a última
 * reunião de onboarding do cliente com transcrição concluída.
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { gerarModo3 } from '@/lib/onboarding/geradores'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { clienteId, transcricao } = await request.json() as {
    clienteId: string
    transcricao?: string
  }

  if (!clienteId) {
    return Response.json({ error: 'clienteId obrigatório' }, { status: 400 })
  }

  const service = createServiceClient()

  // Descobre organization_id e (se preciso) a transcrição da reunião
  const { data: cliente } = await service
    .from('clientes')
    .select('organization_id')
    .eq('id', clienteId)
    .single()

  if (!cliente) {
    return Response.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  let textoTranscricao = transcricao
  if (!textoTranscricao) {
    const { data: reuniao } = await service
      .from('reunioes')
      .select('transcricao_bruta')
      .eq('cliente_id', clienteId)
      .eq('tipo', 'onboarding')
      .eq('transcricao_status', 'concluida')
      .order('data_reuniao', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!reuniao?.transcricao_bruta) {
      return Response.json(
        { error: 'Nenhuma reunião de onboarding com transcrição concluída encontrada.' },
        { status: 404 },
      )
    }
    textoTranscricao = reuniao.transcricao_bruta
  }

  try {
    const resultado = await gerarModo3({
      clienteId,
      organizationId: cliente.organization_id,
      transcricao: textoTranscricao,
    })
    return Response.json({ ...resultado })
  } catch (err) {
    return Response.json({ error: String(err), etapa: 'exception' }, { status: 500 })
  }
}
