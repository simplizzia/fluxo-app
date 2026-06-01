/**
 * GET /api/cron/publicar-agendados
 * Cron horário: publica posts com data_agendada <= now() e status='agendado'.
 * Autorizado apenas via Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publishPost as publishMeta } from '@/lib/social/meta'
import { publishPost as publishLinkedIn } from '@/lib/social/linkedin'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Busca publicações agendadas vencidas
  const { data: publicacoes, error } = await service
    .from('publicacoes_agendadas')
    .select(`
      id, organization_id, card_id,
      plataforma, tipo_conteudo, legenda, hashtags, storage_path,
      data_agendada,
      integracao:integracao_id (
        access_token, page_id, plataforma, ativo, expires_at
      )
    `)
    .eq('status', 'agendado')
    .lte('data_agendada', new Date().toISOString())
    .limit(50)

  if (error) {
    console.error('[publicar-agendados] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!publicacoes || publicacoes.length === 0) {
    return NextResponse.json({ publicadas: 0 })
  }

  let publicadas = 0
  let falhas = 0

  for (const pub of publicacoes) {
    const integracao = pub.integracao as unknown as {
      access_token: string
      page_id: string | null
      plataforma: string
      ativo: boolean
      expires_at: string | null
    } | null

    if (!integracao || !integracao.ativo) {
      await service
        .from('publicacoes_agendadas')
        .update({ status: 'falhou', updated_at: new Date().toISOString() })
        .eq('id', pub.id)
      falhas++
      continue
    }

    // Verifica se o token não expirou
    if (integracao.expires_at && new Date(integracao.expires_at) < new Date()) {
      await service
        .from('publicacoes_agendadas')
        .update({ status: 'falhou', updated_at: new Date().toISOString() })
        .eq('id', pub.id)
      falhas++
      continue
    }

    // Monta texto completo (legenda + hashtags)
    const textoCompleto = pub.hashtags
      ? `${pub.legenda}\n\n${pub.hashtags}`
      : pub.legenda

    // Gera URL pública do arquivo no Storage (se houver)
    let mediaUrl: string | undefined
    if (pub.storage_path) {
      const { data: urlData } = service.storage
        .from('social-media')
        .getPublicUrl(pub.storage_path)
      mediaUrl = urlData.publicUrl
    }

    try {
      let postId: string

      if (pub.plataforma === 'linkedin') {
        if (!integracao.page_id) throw new Error('LinkedIn author URN ausente')
        postId = await publishLinkedIn({
          accessToken: integracao.access_token,
          authorUrn:   integracao.page_id!,
          texto:       textoCompleto ?? '',
          imageUrl:    mediaUrl,
        })
      } else {
        // facebook / instagram
        if (!integracao.page_id) throw new Error('Meta page_id ausente')

        const mediaType =
          pub.tipo_conteudo === 'reel' ? 'REELS'
          : pub.tipo_conteudo === 'story' ? 'VIDEO'
          : 'IMAGE'

        postId = await publishMeta({
          accessToken: integracao.access_token,
          pageId:      integracao.page_id!,
          legenda:     textoCompleto ?? '',
          mediaUrl,
          mediaType,
        })
      }

      await service
        .from('publicacoes_agendadas')
        .update({
          status:            'publicado',
          publicado_em:      new Date().toISOString(),
          plataforma_post_id: postId,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', pub.id)

      publicadas++
    } catch (err) {
      console.error(`[publicar-agendados] falha ao publicar ${pub.id}:`, err)
      await service
        .from('publicacoes_agendadas')
        .update({
          status:     'falhou',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pub.id)
      falhas++
    }
  }

  // Audit log via console apenas (cron não tem org_id único)
  console.log(`[publicar-agendados] publicadas=${publicadas} falhas=${falhas}`)

  return NextResponse.json({ publicadas, falhas })
}
