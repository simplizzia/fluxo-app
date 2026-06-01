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
// publishPost — publica na página do Facebook / Instagram Business
// ---------------------------------------------------------------------------

/**
 * Publica um post (imagem ou vídeo) via Graph API.
 * Para Instagram: usa o endpoint de Reels ou Feed via página conectada.
 * Retorna o ID do post criado na plataforma.
 */
export async function publishPost(opts: MetaPublishOptions): Promise<string> {
  const { accessToken, pageId, legenda, mediaUrl, mediaType = 'IMAGE' } = opts

  if (mediaUrl) {
    // Publicação com mídia: primeiro faz o upload (container)
    if (mediaType === 'VIDEO' || mediaType === 'REELS') {
      // Reel / Vídeo: cria container de vídeo
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
        throw new Error(`Meta video upload error: ${JSON.stringify(err)}`)
      }
      const container = await containerRes.json()
      return container.video_id as string
    } else {
      // Imagem: endpoint photos ou ig_media (Instagram)
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
        throw new Error(`Meta photo publish error: ${JSON.stringify(err)}`)
      }
      const photo = await photoRes.json()
      return photo.post_id ?? (photo.id as string)
    }
  } else {
    // Post somente texto (raro no Instagram, válido no Facebook)
    const feedRes = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: legenda,
        access_token: accessToken,
      }),
    })
    if (!feedRes.ok) {
      const err = await feedRes.json()
      throw new Error(`Meta feed publish error: ${JSON.stringify(err)}`)
    }
    const feed = await feedRes.json()
    return feed.id as string
  }
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
