/**
 * GET /api/auth/google
 * Inicia o fluxo OAuth2 do Google Calendar.
 * Redireciona o usuário para a tela de consentimento do Google.
 */
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/dal'
import { buildOAuthUrl } from '@/lib/google/calendar'

export async function GET() {
  // Requer autenticação — getCurrentProfile redireciona para /login se não autenticado
  const profile = await getCurrentProfile()

  // Usa o profile.id como state (proteção CSRF básica)
  // O callback verifica que o state pertence ao usuário autenticado
  const url = buildOAuthUrl(profile.id)

  return NextResponse.redirect(url)
}
