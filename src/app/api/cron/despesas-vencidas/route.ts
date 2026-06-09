/**
 * GET /api/cron/despesas-vencidas
 * Vercel Cron — roda diariamente às 8h.
 * Marca como 'vencida' toda despesa pendente com vencimento anterior a hoje.
 * Cria notificação in-app para sócias quando há novas despesas vencidas.
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { data: orgs } = await service.from('organizacoes').select('id')
  if (!orgs?.length) return NextResponse.json({ atualizadas: 0 })

  let totalAtualizadas = 0

  for (const org of orgs) {
    try {
      // Busca despesas pendentes vencidas
      const { data: vencidas } = await service
        .from('financeiro_despesas')
        .select('id, descricao, valor')
        .eq('organization_id', org.id)
        .eq('status', 'pendente')
        .eq('ativo', true)
        .lt('vencimento', hoje)

      if (!vencidas?.length) continue

      // Atualiza status para 'vencida'
      const ids = vencidas.map((d) => d.id)
      await service
        .from('financeiro_despesas')
        .update({ status: 'vencida', updated_at: new Date().toISOString() })
        .in('id', ids)

      // Notificação in-app para sócias
      const { data: socias } = await service
        .from('profiles')
        .select('id')
        .eq('organization_id', org.id)
        .eq('papel', 'socia')

      if (socias?.length) {
        const count = vencidas.length
        const titulo = `${count} despesa${count > 1 ? 's' : ''} vencida${count > 1 ? 's' : ''}`
        const primeiras = vencidas.slice(0, 3).map((d) => d.descricao).join(', ')
        const mensagem = count > 3 ? `${primeiras} e mais ${count - 3}.` : primeiras

        await service.from('in_app_notificacoes').insert(
          socias.map((s) => ({
            organization_id: org.id,
            usuario_id: s.id,
            tipo: 'geral' as const,
            titulo,
            mensagem,
            link: '/socias/financeiro',
          })),
        )
      }

      totalAtualizadas += vencidas.length
    } catch (err) {
      console.error('[cron/despesas-vencidas] org:', org.id, err)
    }
  }

  console.log(`[cron/despesas-vencidas] data=${hoje} atualizadas=${totalAtualizadas}`)
  return NextResponse.json({ atualizadas: totalAtualizadas })
}
