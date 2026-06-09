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
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=linkedin`)
  }

  // Decodifica state → userId + clienteId
  let userId: string
  let clienteId: string | null = null
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64url').toString())
    userId   = decoded.userId
    clienteId = decoded.clienteId ?? null
  } catch {
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=linkedin`)
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=linkedin`)
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
    return NextResponse.redirect(`${appUrl}/socias/social?social_error=linkedin`)
  }

  const tokenJson = await tokenRes.json()
  const accessToken: string  = tokenJson.access_token
  const expiresIn:   number  = tokenJson.expires_in ?? 5184000 // 60 dias padrão

  const liHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202501',
  }

  // Busca organizações que o usuário administra
  const aclRes = await fetch(
    'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&count=5',
    { headers: liHeaders },
  )

  let orgUrn: string | null = null
  let orgNome: string | null = null

  if (aclRes.ok) {
    const aclJson = await aclRes.json()
    const firstOrg = aclJson.elements?.[0]?.organization as string | undefined

    if (firstOrg) {
      orgUrn = firstOrg
      // Extrai o ID numérico do URN para buscar o nome: urn:li:organization:123456
      const orgId = firstOrg.split(':').pop()
      if (orgId) {
        const orgRes = await fetch(
          `https://api.linkedin.com/v2/organizations/${orgId}?fields=localizedName`,
          { headers: liHeaders },
        )
        if (orgRes.ok) {
          const orgJson = await orgRes.json()
          orgNome = orgJson.localizedName ?? null
        }
      }
    }
  }

  // Fallback: usa URN pessoal se não encontrou organização
  if (!orgUrn) {
    const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: liHeaders,
    })
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json()
      orgUrn = userinfo.sub ? `urn:li:person:${userinfo.sub}` : null
      orgNome = userinfo.name ?? 'Perfil pessoal'
    }
  }

  const service = createServiceClient()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  const now       = new Date().toISOString()

  // Upsert manual (suporte a cliente_id nullable com índices parciais)
  let query = service.from('integracao_social').select('id')
    .eq('organization_id', profile.organization_id)
    .eq('plataforma', 'linkedin')

  if (clienteId) {
    query = query.eq('cliente_id', clienteId)
  } else {
    query = query.is('cliente_id', null)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    await service.from('integracao_social').update({
      access_token: accessToken,
      page_id:      orgUrn,
      page_nome:    orgNome,
      expires_at:   expiresAt,
      ativo:        true,
      updated_at:   now,
    }).eq('id', existing.id)
  } else {
    await service.from('integracao_social').insert({
      organization_id: profile.organization_id,
      plataforma:      'linkedin',
      cliente_id:      clienteId,
      access_token:    accessToken,
      page_id:         orgUrn,
      page_nome:       orgNome,
      expires_at:      expiresAt,
      ativo:           true,
      criado_por:      profile.id,
      updated_at:      now,
    })
  }

  const redirect = clienteId
    ? `${appUrl}/socias/social?social_ok=linkedin&cliente_id=${clienteId}`
    : `${appUrl}/socias/social?social_ok=linkedin`

  return NextResponse.redirect(redirect)
}
