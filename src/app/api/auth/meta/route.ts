/**
 * GET /api/auth/meta
 * Inicia o fluxo OAuth com o Meta (Facebook/Instagram Business).
 * Redirect para o diálogo de permissão do Facebook.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
].join(',')

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clienteId = req.nextUrl.searchParams.get('cliente_id') ?? null

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
  const state = Buffer.from(JSON.stringify({ userId: user.id, clienteId })).toString('base64url')

  const url = new URL('https://www.facebook.com/v22.0/dialog/oauth')
  url.searchParams.set('client_id', process.env.META_APP_ID!)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('state', state)
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
