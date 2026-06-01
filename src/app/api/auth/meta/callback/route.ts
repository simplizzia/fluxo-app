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
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=meta`)
  }

  // Verifica usuário pelo state
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64url').toString())
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=meta`)
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=meta`)
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
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=meta`)
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

  // Busca páginas gerenciadas
  const pagesRes = await fetch(
    `https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}`,
  )
  const pagesJson = await pagesRes.json()
  const page = pagesJson.data?.[0] as { id?: string; name?: string; access_token?: string } | undefined

  const service = createServiceClient()
  await service.from('integracao_social').upsert({
    organization_id: profile.organization_id,
    plataforma: 'facebook',
    access_token: page?.access_token ?? longToken,
    page_id: page?.id ?? null,
    page_nome: page?.name ?? null,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    ativo: true,
    criado_por: profile.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,plataforma' })

  return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_ok=meta`)
}
