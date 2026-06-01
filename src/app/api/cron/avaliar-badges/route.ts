/**
 * GET /api/cron/avaliar-badges
 * Cron diário às 23:00: avalia badges de zero reproves e recalcula pontuação mensal.
 * Autorizado apenas via Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { avaliarBadgeZeroReprovesMes, calcPontuacaoMensal } from '@/lib/gamificacao'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Busca todas as organizações ativas
  const { data: orgs } = await service
    .from('organizacoes')
    .select('id')
    .eq('ativo', true)

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ organizacoes: 0 })
  }

  let totalOrgs = 0
  let erros = 0

  for (const org of orgs) {
    try {
      const orgId = org.id as string

      // 1. Avalia badge "Zero Reproves" para colaboradores
      await avaliarBadgeZeroReprovesMes(orgId)

      // 2. Recalcula pontuação de todos os colaboradores da org
      const { data: colaboradores } = await service
        .from('profiles')
        .select('id')
        .eq('organization_id', orgId)
        .in('papel', ['executor', 'gestao', 'atendimento', 'socia'])
        .eq('ativo', true)

      await Promise.all(
        (colaboradores ?? []).map((c) => calcPontuacaoMensal(c.id as string, orgId))
      )

      totalOrgs++
    } catch (err) {
      console.error(`[avaliar-badges] erro na org ${org.id}:`, err)
      erros++
    }
  }

  return NextResponse.json({ organizacoes: totalOrgs, erros })
}
