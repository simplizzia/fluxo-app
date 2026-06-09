/**
 * GET /api/cron/refresh-tokens
 * Cron semanal: renova tokens Meta prestes a expirar (≤ 7 dias)
 * e cria notificação in-app para tokens LinkedIn expirando (≤ 14 dias).
 *
 * Tokens Meta (Facebook/Instagram) são renovados automaticamente via
 * fb_exchange_token — o mesmo token serve para ambas as plataformas.
 * Tokens LinkedIn não têm refresh token na API v2; exige reconexão manual.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

const SEVEN_DAYS  = 7  * 24 * 60 * 60 * 1000
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = Date.now()

  // -----------------------------------------------------------------------
  // 1. Renovar tokens Meta expirando em ≤ 7 dias
  // -----------------------------------------------------------------------
  const metaCutoff = new Date(now + SEVEN_DAYS).toISOString()

  const { data: metaExpiring } = await service
    .from('integracao_social')
    .select('id, organization_id, access_token, expires_at, plataforma')
    .in('plataforma', ['facebook', 'instagram'])
    .eq('ativo', true)
    .gte('expires_at', new Date(now).toISOString()) // ainda válido
    .lte('expires_at', metaCutoff)

  // Agrupa por (organization_id + access_token) para não chamar a API duas
  // vezes quando facebook e instagram compartilham o mesmo Page Access Token.
  const seen = new Set<string>()
  let metaRenovados = 0

  for (const integ of metaExpiring ?? []) {
    const key = `${integ.organization_id}:${integ.access_token}`
    if (seen.has(key)) continue
    seen.add(key)

    try {
      const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
      url.searchParams.set('grant_type',        'fb_exchange_token')
      url.searchParams.set('client_id',          process.env.META_APP_ID!)
      url.searchParams.set('client_secret',      process.env.META_APP_SECRET!)
      url.searchParams.set('fb_exchange_token',  integ.access_token)

      const res = await fetch(url.toString())
      if (!res.ok) {
        console.warn('[refresh-tokens] Meta refresh falhou:', integ.id, await res.text())
        continue
      }

      const json = await res.json()
      const newToken:    string = json.access_token
      const expiresIn:   number = json.expires_in ?? 5183944
      const newExpiresAt = new Date(now + expiresIn * 1000).toISOString()

      // Atualiza todas as linhas desta org que compartilham o token antigo
      await service
        .from('integracao_social')
        .update({
          access_token: newToken,
          expires_at:   newExpiresAt,
          updated_at:   new Date().toISOString(),
        })
        .eq('organization_id', integ.organization_id)
        .eq('access_token', integ.access_token)
        .in('plataforma', ['facebook', 'instagram'])

      metaRenovados++
    } catch (err) {
      console.error('[refresh-tokens] erro ao renovar Meta:', integ.id, err)
    }
  }

  // -----------------------------------------------------------------------
  // 2. Notificar sobre tokens LinkedIn expirando em ≤ 14 dias
  // -----------------------------------------------------------------------
  const liCutoff = new Date(now + FOURTEEN_DAYS).toISOString()

  const { data: liExpiring } = await service
    .from('integracao_social')
    .select('id, organization_id, expires_at')
    .eq('plataforma', 'linkedin')
    .eq('ativo', true)
    .gte('expires_at', new Date(now).toISOString())
    .lte('expires_at', liCutoff)

  let liNotificacoes = 0

  for (const integ of liExpiring ?? []) {
    const expiraEm = integ.expires_at
      ? new Date(integ.expires_at).toLocaleDateString('pt-BR')
      : 'em breve'

    // Busca todas as sócias desta organização
    const { data: socias } = await service
      .from('profiles')
      .select('id')
      .eq('organization_id', integ.organization_id)
      .eq('papel', 'socia')

    for (const socia of socias ?? []) {
      // Evita duplicar: verifica se já existe notificação não lida
      const { count } = await service
        .from('in_app_notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', integ.organization_id)
        .eq('usuario_id', socia.id)
        .eq('tipo', 'geral')
        .eq('lida', false)
        .like('titulo', '%LinkedIn%')

      if ((count ?? 0) > 0) continue

      await service.from('in_app_notificacoes').insert({
        organization_id: integ.organization_id,
        usuario_id:      socia.id,
        tipo:            'geral',
        titulo:          'Token LinkedIn expirando',
        mensagem:        `A integração com o LinkedIn expira em ${expiraEm}. Reconecte a conta para continuar agendando publicações.`,
        link:            '/socias/social',
      })
      liNotificacoes++
    }
  }

  console.log(`[refresh-tokens] meta_renovados=${metaRenovados} li_notificacoes=${liNotificacoes}`)
  return NextResponse.json({ metaRenovados, liNotificacoes })
}
