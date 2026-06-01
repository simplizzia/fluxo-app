/**
 * Cron: plano-alerta
 *
 * Roda diariamente às 9h (via Vercel Cron).
 * Verifica clientes que atingiram 80% ou 100% do plano mensal.
 * Notifica socia + atendimento por email.
 * Anti-spam: máximo 1 disparo por cliente por mês (via audit_log).
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buscarEmailsEquipe,
  enviarEmail,
  emailPlanoAlerta,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Autenticação do cron
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Mês corrente
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)

  try {
    // 1. Buscar todas as organizações ativas
    const { data: orgs } = await service
      .from('organizacoes')
      .select('id')

    if (!orgs?.length) {
      return NextResponse.json({ ok: true, verificados: 0 })
    }

    let totalNotificados = 0

    for (const org of orgs) {
      // 2. Clientes ativos com plano
      const { data: planos } = await service
        .from('planos_cliente')
        .select('cliente_id, limite_demandas_mes')
        .eq('organization_id', org.id)

      if (!planos?.length) continue

      // 3. Cards não cancelados deste mês por cliente
      const clienteIds = planos.map((p) => p.cliente_id)

      const { data: cards } = await service
        .from('cards')
        .select('cliente_id')
        .eq('organization_id', org.id)
        .in('cliente_id', clienteIds)
        .neq('status', 'cancelado')
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString())

      const usoPorCliente = new Map<string, number>()
      for (const card of cards ?? []) {
        usoPorCliente.set(card.cliente_id!, (usoPorCliente.get(card.cliente_id!) ?? 0) + 1)
      }

      // 4. Buscar nomes dos clientes
      const { data: clientes } = await service
        .from('clientes')
        .select('id, nome')
        .eq('organization_id', org.id)
        .in('id', clienteIds)

      const nomesPorCliente = new Map((clientes ?? []).map((c) => [c.id, c.nome]))

      // 5. Verificar cada cliente que atingiu ≥ 80%
      for (const plano of planos) {
        const usados = usoPorCliente.get(plano.cliente_id) ?? 0
        const porcentagem = Math.round((usados / plano.limite_demandas_mes) * 100)

        if (porcentagem < 80) continue

        const acaoLog = porcentagem >= 100 ? 'plano.alerta_100' : 'plano.alerta_80'

        // Anti-spam: já notificamos este cliente este mês?
        const { data: jaNotificou } = await service
          .from('audit_log')
          .select('id')
          .eq('organization_id', org.id)
          .eq('acao', acaoLog)
          .eq('entidade', 'cliente')
          .eq('entidade_id', plano.cliente_id)
          .gte('created_at', inicioMes.toISOString())
          .limit(1)
          .maybeSingle()

        if (jaNotificou) continue

        // Enviar email para socia + atendimento
        const emails = await buscarEmailsEquipe(org.id, ['socia', 'atendimento'])
        if (emails.length) {
          const clienteNome = nomesPorCliente.get(plano.cliente_id) ?? 'Cliente'
          const { subject, html } = emailPlanoAlerta({
            clienteNome,
            usados,
            limite: plano.limite_demandas_mes,
            porcentagem,
          })
          await enviarEmail(emails, subject, html)
        }

        // Registrar no audit_log (anti-spam)
        await service.from('audit_log').insert({
          organization_id: org.id,
          usuario_id: null,
          acao: acaoLog,
          entidade: 'cliente',
          entidade_id: plano.cliente_id,
          metadata: { usados, limite: plano.limite_demandas_mes, porcentagem },
        })

        totalNotificados++
      }
    }

    return NextResponse.json({ ok: true, notificados: totalNotificados })
  } catch (err) {
    console.error('[cron/plano-alerta]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
