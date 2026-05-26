import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Callback do Supabase Auth.
 *
 * Trata dois cenários:
 * 1. Convite (type=invite) — troca o code, redireciona para /definir-senha
 * 2. Magic link / recuperação de senha — redireciona para /dashboard ou ?next=
 *
 * O `code` é trocado por uma sessão via PKCE (Proof Key for Code Exchange).
 * Nunca expor o code para o cliente.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')          // 'invite' | 'recovery' | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=codigo_ausente`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(
      `${origin}/login?erro=sessao_invalida`,
    )
  }

  // Convite: usuário precisa definir nome e senha
  if (type === 'invite') {
    return NextResponse.redirect(`${origin}/definir-senha`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
