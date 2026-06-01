/**
 * GET /api/auth/linkedin/callback
 * Callback do OAuth LinkedIn. Troca code por token e salva em integracao_social.
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
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=linkedin`)
  }

  // Decodifica state → userId
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64url').toString())
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=linkedin`)
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=linkedin`)
  }

  // Troca code por access_token
  const redirectUri = `${appUrl}/api/auth/linkedin/callback`
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[linkedin/callback] token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_error=linkedin`)
  }

  const tokenJson = await tokenRes.json()
  const accessToken: string  = tokenJson.access_token
  const expiresIn:   number  = tokenJson.expires_in ?? 5184000 // 60 dias padrão

  // Busca URN do perfil autenticado
  const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  let authorUrn: string | null = null
  if (userinfoRes.ok) {
    const userinfo = await userinfoRes.json()
    authorUrn = userinfo.sub ? `urn:li:person:${userinfo.sub}` : null
  }

  const service = createServiceClient()
  await service.from('integracao_social').upsert({
    organization_id: profile.organization_id,
    plataforma:      'linkedin',
    access_token:    accessToken,
    page_id:         authorUrn,          // reutiliza page_id para armazenar o URN do autor
    page_nome:       null,
    expires_at:      new Date(Date.now() + expiresIn * 1000).toISOString(),
    ativo:           true,
    criado_por:      profile.id,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'organization_id,plataforma' })

  return NextResponse.redirect(`${appUrl}/perfil?tab=integracoes&social_ok=linkedin`)
}
