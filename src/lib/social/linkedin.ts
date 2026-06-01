/**
 * LinkedIn — API v2 (UGC Posts + Shares)
 *
 * Funções exportadas:
 *   publishPost()  → publica texto ou imagem em perfil/organização
 *   fetchMetrics() → coleta impressões, curtidas, comentários, compartilhamentos
 *
 * Documentação: https://learn.microsoft.com/en-us/linkedin/marketing/
 */
import 'server-only'

const LINKEDIN_API = 'https://api.linkedin.com/v2'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface LinkedInPublishOptions {
  accessToken: string
  /** URN do autor: "urn:li:person:xxx" (pessoa) ou "urn:li:organization:xxx" */
  authorUrn: string
  texto: string
  /** URL pública da imagem a ser publicada (opcional) */
  imageUrl?: string
  /** Asset URN retornado após upload de imagem (opcional — alternativa a imageUrl) */
  imageAssetUrn?: string
}

export interface LinkedInMetrics {
  impressoes: number
  curtidas: number
  comentarios: number
  compartilhamentos: number
  cliques: number
}

// ---------------------------------------------------------------------------
// publishPost
// ---------------------------------------------------------------------------

export async function publishPost(opts: LinkedInPublishOptions): Promise<string> {
  const { accessToken, authorUrn, texto, imageUrl, imageAssetUrn } = opts

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202501',
  }

  // Se há imagem, faz upload primeiro (se não tiver asset URN já)
  let mediaAsset: string | undefined = imageAssetUrn
  if (imageUrl && !mediaAsset) {
    mediaAsset = await uploadImage(accessToken, authorUrn, imageUrl)
  }

  // Monta o body do UGC Post
  const body: Record<string, unknown> = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: texto },
        shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
        ...(mediaAsset
          ? {
              media: [
                {
                  status: 'READY',
                  media: mediaAsset,
                },
              ],
            }
          : {}),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LinkedIn publishPost error ${res.status}: ${errText}`)
  }

  // O ID do post está no header X-LinkedIn-Id ou no body
  const postId = res.headers.get('x-linkedin-id') ?? ''
  return postId
}

// ---------------------------------------------------------------------------
// uploadImage — registo + upload de imagem via LinkedIn Asset API
// ---------------------------------------------------------------------------

async function uploadImage(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string,
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202501',
  }

  // 1. Registra o asset
  const registerRes = await fetch(`${LINKEDIN_API}/assets?action=registerUpload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      registerUploadRequest: {
        owner: ownerUrn,
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        serviceRelationships: [
          { identifier: 'urn:li:userGeneratedContent', relationshipType: 'OWNER' },
        ],
      },
    }),
  })

  if (!registerRes.ok) throw new Error('LinkedIn registerUpload failed')
  const registerJson = await registerRes.json()
  const uploadUrl: string =
    registerJson.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ]?.uploadUrl
  const assetUrn: string = registerJson.value?.asset

  if (!uploadUrl || !assetUrn) throw new Error('LinkedIn: missing uploadUrl or assetUrn')

  // 2. Baixa a imagem e faz upload
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error('Não foi possível baixar a imagem para upload no LinkedIn')
  const imgBuffer = await imgRes.arrayBuffer()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBuffer,
  })
  if (!uploadRes.ok) throw new Error('LinkedIn image upload PUT failed')

  return assetUrn
}

// ---------------------------------------------------------------------------
// fetchMetrics — coleta métricas via Organizational Entity Share Statistics
// ---------------------------------------------------------------------------

export async function fetchMetrics(
  postUrn: string,
  accessToken: string,
): Promise<LinkedInMetrics> {
  const encoded = encodeURIComponent(postUrn)
  const res = await fetch(
    `${LINKEDIN_API}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encoded}&shares[0]=${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    },
  )

  if (!res.ok) {
    console.warn('[fetchMetrics/linkedin] error:', res.status)
    return { impressoes: 0, curtidas: 0, comentarios: 0, compartilhamentos: 0, cliques: 0 }
  }

  const json = await res.json()
  const stats = json.elements?.[0]?.totalShareStatistics ?? {}

  return {
    impressoes:       stats.impressionCount ?? 0,
    curtidas:         stats.likeCount       ?? 0,
    comentarios:      stats.commentCount    ?? 0,
    compartilhamentos: stats.shareCount     ?? 0,
    cliques:          stats.clickCount      ?? 0,
  }
}

// ---------------------------------------------------------------------------
// getProfileUrn — retorna o URN do usuário autenticado
// ---------------------------------------------------------------------------

export async function getProfileUrn(accessToken: string): Promise<string | null> {
  const res = await fetch(`${LINKEDIN_API}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.sub ? `urn:li:person:${json.sub}` : null
}
