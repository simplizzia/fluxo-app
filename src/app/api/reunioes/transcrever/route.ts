/**
 * POST /api/reunioes/transcrever
 *
 * Transcreve o áudio de uma reunião usando o Whisper API (OpenAI).
 * Atualiza `transcricao_status`, `transcricao_bruta` e opcionalmente `notas_brutas`.
 *
 * Body: { reuniaoId: string; copiarParaNotas?: boolean }
 *
 * Requer: usuário autenticado com papel de equipe (não cliente).
 * Pode levar até 60s em arquivos longos — exportar maxDuration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/transcricao'

// Aumenta o timeout do Vercel para este route (requer Vercel Pro / Fluid Compute)
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ---------------------------------------------------------------------------
  // 1. Autenticação — usuário deve ser da equipe
  // ---------------------------------------------------------------------------
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  // Verifica papel — clientes não podem transcrever
  const { data: profile } = await supabase
    .from('profiles')
    .select('papel, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.papel === 'cliente') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  // ---------------------------------------------------------------------------
  // 2. Valida body
  // ---------------------------------------------------------------------------
  let reuniaoId: string
  let copiarParaNotas: boolean = true

  try {
    const body = await req.json()
    reuniaoId = body.reuniaoId as string
    if (body.copiarParaNotas !== undefined) copiarParaNotas = Boolean(body.copiarParaNotas)
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!reuniaoId) {
    return NextResponse.json({ error: 'reuniaoId é obrigatório.' }, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // 3. Busca a reunião e verifica posse da org
  // ---------------------------------------------------------------------------
  const service = createServiceClient()

  const { data: reuniao } = await service
    .from('reunioes')
    .select('id, organization_id, audio_storage_path, transcricao_status')
    .eq('id', reuniaoId)
    .single()

  if (!reuniao) {
    return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })
  }

  if (reuniao.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const audio = (reuniao as { audio_storage_path?: string | null }).audio_storage_path
  if (!audio) {
    return NextResponse.json(
      { error: 'Nenhum áudio enviado para esta reunião.' },
      { status: 422 },
    )
  }

  const statusAtual = (reuniao as { transcricao_status?: string }).transcricao_status
  if (statusAtual === 'processando') {
    return NextResponse.json(
      { error: 'Transcrição já em andamento.' },
      { status: 409 },
    )
  }

  // ---------------------------------------------------------------------------
  // 4. Marca como processando e transcreve
  // ---------------------------------------------------------------------------
  await service
    .from('reunioes')
    .update({ transcricao_status: 'processando', updated_at: new Date().toISOString() })
    .eq('id', reuniaoId)

  try {
    const texto = await transcribeAudio(audio)

    const updates = {
      transcricao_bruta: texto,
      transcricao_status: 'concluida' as const,
      updated_at: new Date().toISOString(),
      ...(copiarParaNotas ? { notas_brutas: texto } : {}),
    }

    await service.from('reunioes').update(updates).eq('id', reuniaoId)

    return NextResponse.json({
      ok: true,
      caracteres: texto.length,
      copiouParaNotas: copiarParaNotas,
    })
  } catch (err) {
    console.error('[POST /api/reunioes/transcrever]', err)

    await service
      .from('reunioes')
      .update({ transcricao_status: 'erro', updated_at: new Date().toISOString() })
      .eq('id', reuniaoId)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na transcrição.' },
      { status: 500 },
    )
  }
}
