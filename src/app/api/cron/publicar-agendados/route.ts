/**
 * GET /api/cron/publicar-agendados
 * Cron diário: publica posts com data_agendada <= now() e status='agendado'.
 * Também retenta posts com status='falhou' e tentativas < 3.
 * Após 3 falhas, cria notificação in-app para as sócias da organização.
 * Autorizado apenas via Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publishPost as publishFacebook, publishInstagram } from '@/lib/social/meta'
import { publishPost as publishLinkedIn } from '@/lib/social/linkedin'

export const maxDuration = 60

const MAX_TENTATIVAS = 3

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Busca publicações agendadas vencidas + falhas elegíveis para retry
  const { data: publicacoes, error } = await service
    .from('publicacoes_agendadas')
    .select(`
      id, organization_id, card_id,
      plataforma, tipo_conteudo, legenda, hashtags, storage_path,
      data_agendada, tentativas, rotulo_ia,
      integracao:integracao_id (
        access_token, page_id, plataforma, ativo, expires_at
      )
    `)
    .or(`status.eq.agendado,and(status.eq.falhou,tentativas.lt.${MAX_TENTATIVAS})`)
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
      await falhar(service, pub.id, pub.organization_id, pub.tentativas,
        'Integração inativa ou não encontrada', pub.plataforma, pub.legenda)
      falhas++
      continue
    }

    // Verifica se o token não expirou
    if (integracao.expires_at && new Date(integracao.expires_at) < new Date()) {
      await falhar(service, pub.id, pub.organization_id, pub.tentativas,
        'Token de acesso expirado — reconecte a integração', pub.plataforma, pub.legenda)
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
      } else if (pub.plataforma === 'instagram') {
        if (!integracao.page_id) throw new Error('Instagram Business Account ID ausente')
        const igMediaType =
          pub.tipo_conteudo === 'reel'  ? 'REELS'
          : pub.tipo_conteudo === 'story' ? 'STORIES'
          : 'IMAGE'

        postId = await publishInstagram({
          accessToken:    integracao.access_token,
          igUserId:       integracao.page_id!,
          legenda:        textoCompleto ?? '',
          mediaUrl,
          mediaType:      igMediaType,
          isAiGenerated:  pub.rotulo_ia === true,
        })
      } else {
        // facebook
        if (!integracao.page_id) throw new Error('Facebook page_id ausente')

        const fbMediaType =
          pub.tipo_conteudo === 'reel' ? 'REELS'
          : pub.tipo_conteudo === 'story' ? 'VIDEO'
          : 'IMAGE'

        postId = await publishFacebook({
          accessToken: integracao.access_token,
          pageId:      integracao.page_id!,
          legenda:     textoCompleto ?? '',
          mediaUrl,
          mediaType:   fbMediaType,
        })
      }

      await service
        .from('publicacoes_agendadas')
        .update({
          status:             'publicado',
          publicado_em:       new Date().toISOString(),
          plataforma_post_id: postId,
          updated_at:         new Date().toISOString(),
        })
        .eq('id', pub.id)

      publicadas++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[publicar-agendados] falha ao publicar ${pub.id}:`, err)
      await falhar(service, pub.id, pub.organization_id, pub.tentativas, msg, pub.plataforma, pub.legenda)
      falhas++
    }
  }

  console.log(`[publicar-agendados] publicadas=${publicadas} falhas=${falhas}`)
  return NextResponse.json({ publicadas, falhas })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SupabaseService = ReturnType<typeof createServiceClient>

async function falhar(
  service: SupabaseService,
  pubId: string,
  orgId: string,
  tentativasAtual: number,
  mensagemErro: string,
  plataforma: string,
  legenda: string | null,
) {
  const novasTentativas = (tentativasAtual ?? 0) + 1

  await service
    .from('publicacoes_agendadas')
    .update({
      status:         'falhou',
      tentativas:     novasTentativas,
      erro_mensagem:  mensagemErro,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', pubId)

  // Após MAX_TENTATIVAS, notifica as sócias da organização
  if (novasTentativas >= MAX_TENTATIVAS) {
    const { data: socias } = await service
      .from('profiles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('papel', 'socia')

    const trecho = (legenda ?? '').slice(0, 60)
    const titulo = `Publicação falhou após ${MAX_TENTATIVAS} tentativas`
    const msg    = `"${trecho}${trecho.length >= 60 ? '…' : ''}" em ${plataforma}: ${mensagemErro}`

    for (const socia of socias ?? []) {
      await service.from('in_app_notificacoes').insert({
        organization_id: orgId,
        usuario_id:      socia.id,
        tipo:            'publicacao_falhou',
        titulo,
        mensagem:        msg,
        link:            '/socias/social',
      })
    }
  }
}
