/**
 * GET /api/auth/meta/callback
 * Callback do OAuth Meta. Troca code por tokens e salva em integracao_social.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=meta`)
  }

  // Verifica usuário pelo state
  let userId: string
  let clienteId: string | null = null
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64url').toString())
    userId = decoded.userId
    clienteId = decoded.clienteId ?? null
  } catch {
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=meta`)
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=meta`)
  }

  // Troca code por access_token
  const redirectUri = `${appUrl}/api/auth/meta/callback`
  const tokenUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString())
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=meta`)
  }

  const tokenJson = await tokenRes.json()
  const userToken: string = tokenJson.access_token

  // Troca por Long-Lived Token (60 dias)
  const llRes = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}` +
    `&fb_exchange_token=${userToken}`,
  )
  const llJson = await llRes.json()
  const longToken: string = llJson.access_token ?? userToken
  const expiresIn: number = llJson.expires_in ?? 5183944

  // Busca páginas gerenciadas — inclui instagram_business_account em um único request
  const pagesRes = await fetch(
    `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`,
  )
  const pagesJson = await pagesRes.json()
  const page = pagesJson.data?.[0] as {
    id?: string
    name?: string
    access_token?: string
    instagram_business_account?: { id: string }
  } | undefined

  const pageToken = page?.access_token ?? longToken
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const service = createServiceClient()
  const now = new Date().toISOString()
  const profileSafe = profile! // já verificado acima com early return

  // Upsert manual (suporte a cliente_id nullable com índices parciais)
  async function upsertIntegracao(dados: {
    plataforma: 'facebook' | 'instagram' | 'linkedin'
    access_token: string
    page_id: string | null
    page_nome: string | null
  }) {
    let query = service.from('integracao_social').select('id')
      .eq('organization_id', profileSafe.organization_id)
      .eq('plataforma', dados.plataforma)

    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    } else {
      query = query.is('cliente_id', null)
    }

    const { data: existing } = await query.maybeSingle()

    if (existing) {
      await service.from('integracao_social').update({
        access_token: dados.access_token,
        page_id:      dados.page_id,
        page_nome:    dados.page_nome,
        expires_at:   expiresAt,
        ativo:        true,
        updated_at:   now,
      }).eq('id', existing.id)
    } else {
      await service.from('integracao_social').insert({
        organization_id: profileSafe.organization_id,
        plataforma:      dados.plataforma,
        cliente_id:      clienteId,
        access_token:    dados.access_token,
        page_id:         dados.page_id,
        page_nome:       dados.page_nome,
        expires_at:      expiresAt,
        ativo:           true,
        criado_por:      profileSafe.id,
        updated_at:      now,
      })
    }
  }

  // Salva integração do Facebook
  await upsertIntegracao({
    plataforma:  'facebook',
    access_token: pageToken,
    page_id:     page?.id ?? null,
    page_nome:   page?.name ?? null,
  })

  // Salva integração do Instagram (se houver conta Business conectada à página)
  const igId = page?.instagram_business_account?.id
  if (igId) {
    await upsertIntegracao({
      plataforma:  'instagram',
      access_token: pageToken,
      page_id:     igId,
      page_nome:   page?.name ? `${page.name} (Instagram)` : 'Instagram Business',
    })
  }

  const redirect = clienteId
    ? `${appUrl}/socias/social?social_ok=meta&cliente_id=${clienteId}`
    : `${appUrl}/socias/social?social_ok=meta`

  return NextResponse.redirect(redirect)
}
