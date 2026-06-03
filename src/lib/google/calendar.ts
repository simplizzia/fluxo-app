/**
 * Google Calendar API — fetch direto (sem googleapis npm package)
 *
 * Funções exportadas:
 *   buildOAuthUrl()           → URL para iniciar o fluxo OAuth2
 *   exchangeCodeForTokens()   → troca o code por access + refresh token
 *   getValidAccessToken()     → retorna access token válido (renova se expirado)
 *   criarEventoCalendar()     → cria evento no Calendar do usuário
 *   atualizarEventoCalendar() → atualiza evento existente
 *   excluirEventoCalendar()   → remove evento (ignora 404)
 */

import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_OAUTH_URL    = 'https://accounts.google.com/o/oauth2/v2/auth'
const TIMEZONE            = 'America/Sao_Paulo'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  // Sprint 5.3: acesso às notas do Gemini geradas no Google Meet
  'https://www.googleapis.com/auth/meetings.space.readonly',
].join(' ')

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base}/api/auth/google/callback`
}

// ---------------------------------------------------------------------------
// OAuth2 — URL de autorização
// ---------------------------------------------------------------------------

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',   // necessário para receber refresh_token
    prompt:        'consent',   // força exibição mesmo se já autorizou antes
    state,
  })
  return `${GOOGLE_OAUTH_URL}?${params}`
}

// ---------------------------------------------------------------------------
// OAuth2 — Troca de code por tokens
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  email: string
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  getRedirectUri(),
      grant_type:    'authorization_code',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${body}`)
  }

  const tokenData = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // Busca email do usuário Google
  const infoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const info = (await infoRes.json()) as { email: string }

  return {
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in:    tokenData.expires_in,
    email:         info.email,
  }
}

// ---------------------------------------------------------------------------
// OAuth2 — Renovação de token
// ---------------------------------------------------------------------------

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  return { access_token: data.access_token, expires_in: data.expires_in }
}

// ---------------------------------------------------------------------------
// Helper: retorna access token válido para um usuário (renova se necessário)
// Retorna null se o usuário não tem Google Calendar conectado ou se o
// refresh falhou (credenciais revogadas).
// ---------------------------------------------------------------------------

export async function getValidAccessToken(usuarioId: string): Promise<string | null> {
  const service = createServiceClient()

  const { data: row } = await service
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (!row) return null

  // Verifica expiração com margem de 5 minutos
  const expiry = new Date((row as { token_expiry: string }).token_expiry)
  const isExpired = expiry.getTime() - Date.now() < 5 * 60 * 1000

  if (!isExpired) {
    return (row as { access_token: string }).access_token
  }

  // Renova o token
  try {
    const refreshed = await refreshAccessToken(
      (row as { refresh_token: string }).refresh_token,
    )
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    await service
      .from('google_calendar_tokens')
      .update({
        access_token: refreshed.access_token,
        token_expiry: newExpiry,
        updated_at:   new Date().toISOString(),
      })
      .eq('usuario_id', usuarioId)

    return refreshed.access_token
  } catch (err) {
    console.error('[getValidAccessToken] refresh failed:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Helper: verifica se um usuário tem Google Calendar conectado
// ---------------------------------------------------------------------------

export async function getGoogleCalendarInfo(usuarioId: string): Promise<{
  conectado: boolean
  email: string | null
}> {
  const service = createServiceClient()

  const { data: row } = await service
    .from('google_calendar_tokens')
    .select('google_email')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (!row) return { conectado: false, email: null }
  return {
    conectado: true,
    email: (row as { google_email: string }).google_email,
  }
}

// ---------------------------------------------------------------------------
// Helper: desconecta Google Calendar (deleta tokens do DB)
// ---------------------------------------------------------------------------

export async function desconectarGoogleCalendar(usuarioId: string): Promise<void> {
  const service = createServiceClient()
  await service.from('google_calendar_tokens').delete().eq('usuario_id', usuarioId)
}

// ---------------------------------------------------------------------------
// Google Calendar API — CRUD de eventos
// ---------------------------------------------------------------------------

export interface EventoCalendar {
  summary: string
  description?: string
  startDateTime: string  // ISO 8601
  endDateTime: string    // ISO 8601
  attendees?: { email: string; displayName?: string }[]
  location?: string
}

export interface EventoCriado {
  eventId: string
  meetLink: string | null
}

/**
 * Cria evento no Google Calendar primário do usuário.
 * Quando `comMeet` é true, solicita ao Google a geração automática de um link
 * do Google Meet (conferenceData) e o retorna junto com o eventId.
 */
export async function criarEventoCalendar(
  accessToken: string,
  evento: EventoCalendar,
  comMeet = false,
): Promise<EventoCriado> {
  const body: Record<string, unknown> = {
    summary:     evento.summary,
    description: evento.description ?? '',
    start: { dateTime: evento.startDateTime, timeZone: TIMEZONE },
    end:   { dateTime: evento.endDateTime,   timeZone: TIMEZONE },
    attendees: evento.attendees ?? [],
    ...(evento.location ? { location: evento.location } : {}),
    reminders: {
      useDefault:  false,
      overrides:   [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 15 }],
    },
  }

  if (comMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }

  // sendUpdates=all → Google dispara os emails de convite para os participantes
  const params = new URLSearchParams({ sendUpdates: 'all' })
  if (comMeet) params.set('conferenceDataVersion', '1')
  const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Calendar createEvent failed (${res.status}): ${err}`)
  }

  const data = (await res.json()) as {
    id: string
    hangoutLink?: string
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] }
  }

  const meetLink =
    data.hangoutLink ??
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
    null

  return { eventId: data.id, meetLink }
}

/** Atualiza evento existente no Google Calendar. */
export async function atualizarEventoCalendar(
  accessToken: string,
  eventId: string,
  evento: EventoCalendar,
): Promise<void> {
  const body = {
    summary:     evento.summary,
    description: evento.description ?? '',
    start: { dateTime: evento.startDateTime, timeZone: TIMEZONE },
    end:   { dateTime: evento.endDateTime,   timeZone: TIMEZONE },
    attendees: evento.attendees ?? [],
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}?sendUpdates=all`,
    {
      method:  'PUT',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Calendar updateEvent failed (${res.status}): ${err}`)
  }
}

/** Remove evento do Google Calendar (ignora 404 — já deletado). */
export async function excluirEventoCalendar(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  // 204 = sucesso, 404 = já deletado — ambos são OK
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Google Calendar deleteEvent failed (${res.status}): ${err}`)
  }
}
