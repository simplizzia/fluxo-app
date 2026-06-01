/**
 * GET /api/cron/coletar-metricas
 * Cron semanal: coleta métricas dos posts publicados nos últimos 90 dias.
 * Autorizado apenas via Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchMetrics as fetchMetaMeta } from '@/lib/social/meta'
import { fetchMetrics as fetchLinkedInMetrics } from '@/lib/social/linkedin'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Busca publicações publicadas nos últimos 90 dias
  const corte = new Date()
  corte.setDate(corte.getDate() - 90)

  const { data: publicacoes, error } = await service
    .from('publicacoes_agendadas')
    .select(`
      id, organization_id, plataforma, plataforma_post_id,
      integracao:integracao_social_id (
        access_token, page_id, ativo, expires_at
      )
    `)
    .eq('status', 'publicado')
    .gte('publicado_em', corte.toISOString())
    .not('plataforma_post_id', 'is', null)
    .limit(200)

  if (error) {
    console.error('[coletar-metricas] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!publicacoes || publicacoes.length === 0) {
    return NextResponse.json({ coletadas: 0 })
  }

  let coletadas = 0
  let falhas = 0

  for (const pub of publicacoes) {
    const integracao = pub.integracao as unknown as {
      access_token: string
      page_id: string | null
      ativo: boolean
      expires_at: string | null
    } | null

    if (!integracao || !integracao.ativo || !pub.plataforma_post_id) {
      falhas++
      continue
    }

    if (integracao.expires_at && new Date(integracao.expires_at) < new Date()) {
      falhas++
      continue
    }

    try {
      let metricas: {
        alcance?: number
        impressoes: number
        curtidas: number
        comentarios: number
        compartilhamentos: number
        salvamentos?: number
        cliques?: number
      }

      if (pub.plataforma === 'linkedin') {
        const m = await fetchLinkedInMetrics(pub.plataforma_post_id, integracao.access_token)
        metricas = {
          impressoes:        m.impressoes,
          curtidas:          m.curtidas,
          comentarios:       m.comentarios,
          compartilhamentos: m.compartilhamentos,
          cliques:           m.cliques,
          alcance:           0,
          salvamentos:       0,
        }
      } else {
        // facebook / instagram
        const m = await fetchMetaMeta(pub.plataforma_post_id, integracao.access_token)
        metricas = {
          alcance:           m.alcance,
          impressoes:        m.impressoes,
          curtidas:          m.curtidas,
          comentarios:       m.comentarios,
          compartilhamentos: m.compartilhamentos,
          salvamentos:       m.salvamentos,
        }
      }

      await service.from('metricas_sociais').insert({
        organization_id:    pub.organization_id,
        publicacao_id:      pub.id,
        coletado_em:        new Date().toISOString(),
        alcance:            metricas.alcance ?? 0,
        impressoes:         metricas.impressoes,
        curtidas:           metricas.curtidas,
        comentarios:        metricas.comentarios,
        compartilhamentos:  metricas.compartilhamentos,
        salvamentos:        metricas.salvamentos ?? 0,
      })

      coletadas++
    } catch (err) {
      console.error(`[coletar-metricas] falha em ${pub.id}:`, err)
      falhas++
    }
  }

  return NextResponse.json({ coletadas, falhas })
}
