/**
 * GET /api/auth/linkedin
 * Inicia o fluxo OAuth 2.0 do LinkedIn.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SCOPES = ['w_member_social', 'r_organization_social', 'w_organization_social', 'openid', 'profile'].join(' ')

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clienteId = req.nextUrl.searchParams.get('cliente_id') ?? null

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`
  const state = Buffer.from(JSON.stringify({ userId: user.id, clienteId })).toString('base64url')

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', process.env.LINKEDIN_CLIENT_ID!)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', SCOPES)

  return NextResponse.redirect(url.toString())
}
