/**
 * Meta (Facebook / Instagram) — Graph API v22
 *
 * Funções exportadas:
 *   publishPost()    → publica imagem/vídeo + legenda em uma página
 *   fetchMetrics()   → coleta alcance, impressões, engajamento de um post
 *
 * Requer variáveis de ambiente:
 *   (nenhuma — tokens vêm do banco via integracao_social)
 *
 * Documentação: https://developers.facebook.com/docs/graph-api/reference
 */
import 'server-only'

const GRAPH_URL = 'https://graph.facebook.com/v22.0'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface MetaPublishOptions {
  accessToken: string
  pageId: string
  legenda: string
  /** URL pública do arquivo de mídia (imagem/vídeo) */
  mediaUrl?: string
  /** Tipo de conteúdo: imagem, vídeo (reels), story */
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS'
}

export interface MetaMetrics {
  alcance: number
  impressoes: number
  curtidas: number
  comentarios: number
  compartilhamentos: number
  salvamentos: number
}

// ---------------------------------------------------------------------------
// publishPost — publica na página do Facebook via Graph API
// ---------------------------------------------------------------------------

/**
 * Publica um post na Página do Facebook.
 * Para Instagram Business, use publishInstagram().
 */
export async function publishPost(opts: MetaPublishOptions): Promise<string> {
  const { accessToken, pageId, legenda, mediaUrl, mediaType = 'IMAGE' } = opts

  if (mediaUrl) {
    if (mediaType === 'VIDEO' || mediaType === 'REELS') {
      const containerRes = await fetch(`${GRAPH_URL}/${pageId}/video_reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: mediaUrl,
          caption: legenda,
          access_token: accessToken,
          upload_phase: 'start',
        }),
      })
      if (!containerRes.ok) {
        const err = await containerRes.json()
        throw new Error(`Facebook video upload error: ${JSON.stringify(err)}`)
      }
      const container = await containerRes.json()
      return container.video_id as string
    } else {
      const photoRes = await fetch(`${GRAPH_URL}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mediaUrl,
          caption: legenda,
          access_token: accessToken,
        }),
      })
      if (!photoRes.ok) {
        const err = await photoRes.json()
        throw new Error(`Facebook photo publish error: ${JSON.stringify(err)}`)
      }
      const photo = await photoRes.json()
      return photo.post_id ?? (photo.id as string)
    }
  } else {
    const feedRes = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: legenda, access_token: accessToken }),
    })
    if (!feedRes.ok) {
      const err = await feedRes.json()
      throw new Error(`Facebook feed publish error: ${JSON.stringify(err)}`)
    }
    const feed = await feedRes.json()
    return feed.id as string
  }
}

// ---------------------------------------------------------------------------
// publishInstagram — publica no Instagram Business via Content Publishing API
//
// Fluxo obrigatório de 2 passos:
//   1. POST /{igUserId}/media   → cria container (creation_id)
//   2. POST /{igUserId}/media_publish → publica o container
//
// igUserId = instagram_business_account.id (salvo no campo page_id)
// accessToken = Page Access Token da Facebook Page conectada ao Instagram
// ---------------------------------------------------------------------------

export interface InstagramPublishOptions {
  accessToken: string
  igUserId: string    // Instagram Business Account ID (page_id na tabela)
  legenda: string
  mediaUrl?: string
  mediaType?: 'IMAGE' | 'REELS' | 'STORIES'
  isAiGenerated?: boolean
}

export async function publishInstagram(opts: InstagramPublishOptions): Promise<string> {
  const { accessToken, igUserId, legenda, mediaUrl, mediaType = 'IMAGE', isAiGenerated = false } = opts

  if (!mediaUrl) {
    throw new Error('Instagram Business API requer mídia (imagem ou vídeo). Posts somente-texto não são suportados.')
  }

  // Passo 1: Criar container de mídia
  const containerBody: Record<string, unknown> = {
    caption: legenda,
    access_token: accessToken,
  }

  if (mediaType === 'REELS') {
    containerBody.media_type = 'REELS'
    containerBody.video_url = mediaUrl
  } else if (mediaType === 'STORIES') {
    containerBody.media_type = 'STORIES'
    containerBody.image_url = mediaUrl
  } else {
    // IMAGE (default)
    containerBody.image_url = mediaUrl
  }

  if (isAiGenerated) {
    containerBody.is_ai_generated = true
  }

  const containerRes = await fetch(`${GRAPH_URL}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(containerBody),
  })

  if (!containerRes.ok) {
    const err = await containerRes.json()
    throw new Error(`Instagram container error: ${JSON.stringify(err)}`)
  }

  const { id: creationId } = await containerRes.json() as { id: string }

  // Passo 2: Publicar o container
  const publishRes = await fetch(`${GRAPH_URL}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  })

  if (!publishRes.ok) {
    const err = await publishRes.json()
    throw new Error(`Instagram publish error: ${JSON.stringify(err)}`)
  }

  const { id: postId } = await publishRes.json() as { id: string }
  return postId
}

// ---------------------------------------------------------------------------
// fetchMetrics — coleta métricas de um post publicado
// ---------------------------------------------------------------------------

/**
 * Busca métricas de engajamento de um post via Graph API Insights.
 * Funciona para posts de Página do Facebook.
 * Para Instagram, os insights usam o mesmo endpoint via Business Discovery.
 */
export async function fetchMetrics(
  postId: string,
  accessToken: string,
): Promise<MetaMetrics> {
  const metrics = [
    'post_impressions',
    'post_impressions_unique',
    'post_reactions_like_total',
    'post_comments',
    'post_shares',
  ].join(',')

  const res = await fetch(
    `${GRAPH_URL}/${postId}/insights?metric=${metrics}&access_token=${encodeURIComponent(accessToken)}`,
  )

  if (!res.ok) {
    console.warn('[fetchMetrics/meta] insights error:', res.status)
    return { alcance: 0, impressoes: 0, curtidas: 0, comentarios: 0, compartilhamentos: 0, salvamentos: 0 }
  }

  const json = await res.json()
  const data: { name: string; values: { value: number }[] }[] = json.data ?? []

  function val(name: string): number {
    const entry = data.find((d) => d.name === name)
    return entry?.values?.[0]?.value ?? 0
  }

  return {
    impressoes:        val('post_impressions'),
    alcance:           val('post_impressions_unique'),
    curtidas:          val('post_reactions_like_total'),
    comentarios:       val('post_comments'),
    compartilhamentos: val('post_shares'),
    salvamentos:       0, // não disponível via Insights básico
  }
}

// ---------------------------------------------------------------------------
// getPageAccessToken — troca user token por page token
// ---------------------------------------------------------------------------

export async function getPageAccessToken(
  userToken: string,
  pageId: string,
): Promise<string | null> {
  const res = await fetch(
    `${GRAPH_URL}/${pageId}?fields=access_token&access_token=${userToken}`,
  )
  if (!res.ok) return null
  const json = await res.json()
  return (json.access_token as string | undefined) ?? null
}
