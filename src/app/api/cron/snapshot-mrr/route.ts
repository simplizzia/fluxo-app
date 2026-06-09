/**
 * GET /api/cron/snapshot-mrr
 * Cron mensal: calcula o MRR atual de cada organização e persiste em mrr_historico.
 * Usa UPSERT pelo índice único (organization_id, mes) para ser idempotente.
 * Autorizado apenas via Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Primeiro dia do mês corrente
  const hoje = new Date()
  const mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]

  // Busca MRR agrupado por organização (soma de valor_mensal das receitas ativas)
  const { data: receitas, error } = await service
    .from('financeiro_receitas')
    .select('organization_id, valor_mensal, cliente_id')
    .eq('ativo', true)

  if (error) {
    console.error('[snapshot-mrr] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!receitas || receitas.length === 0) {
    return NextResponse.json({ snaps: 0 })
  }

  // Agrupa por organização
  const porOrg = new Map<string, { mrr: number; clienteIds: Set<string> }>()
  for (const r of receitas) {
    const entry = porOrg.get(r.organization_id) ?? { mrr: 0, clienteIds: new Set() }
    entry.mrr += Number(r.valor_mensal)
    if (r.cliente_id) entry.clienteIds.add(r.cliente_id)
    porOrg.set(r.organization_id, entry)
  }

  let snaps = 0
  let falhas = 0

  for (const [orgId, { mrr, clienteIds }] of porOrg) {
    const { error: upsertError } = await service
      .from('mrr_historico')
      .upsert(
        {
          organization_id: orgId,
          mes,
          mrr: Math.round(mrr * 100) / 100,
          clientes_ativos: clienteIds.size,
        },
        { onConflict: 'organization_id,mes' },
      )

    if (upsertError) {
      console.error(`[snapshot-mrr] falha org ${orgId}:`, upsertError.message)
      falhas++
    } else {
      snaps++
    }
  }

  console.log(`[snapshot-mrr] mes=${mes} snaps=${snaps} falhas=${falhas}`)
  return NextResponse.json({ mes, snaps, falhas })
}
