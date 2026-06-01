/**
 * GET /api/auth/google/callback
 * Recebe o código de autorização do Google, troca por tokens,
 * salva no banco e redireciona para /perfil.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/dal'
import { createServiceClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/google/calendar'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { searchParams } = new URL(req.url)

  const error = searchParams.get('error')
  const code  = searchParams.get('code')

  // Usuário negou a autorização
  if (error || !code) {
    console.warn('[google/callback] error or no code:', error)
    return NextResponse.redirect(`${appUrl}/perfil?google=negado`)
  }

  try {
    // Verifica sessão ativa do Simplizzia
    const profile = await getCurrentProfile()

    // Troca o code por tokens + email do Google
    const tokens = await exchangeCodeForTokens(code)

    // Salva (ou atualiza) os tokens no banco via service role
    const service = createServiceClient()
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: upsertError } = await service
      .from('google_calendar_tokens')
      .upsert(
        {
          organization_id: profile.organization_id,
          usuario_id:      profile.id,
          access_token:    tokens.access_token,
          refresh_token:   tokens.refresh_token,
          token_expiry:    tokenExpiry,
          google_email:    tokens.email,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'usuario_id' },
      )

    if (upsertError) {
      console.error('[google/callback] upsert error:', upsertError.message)
      return NextResponse.redirect(`${appUrl}/perfil?google=erro`)
    }

    return NextResponse.redirect(`${appUrl}/perfil?google=conectado`)
  } catch (err) {
    console.error('[google/callback] unexpected error:', err)
    return NextResponse.redirect(`${appUrl}/perfil?google=erro`)
  }
}
