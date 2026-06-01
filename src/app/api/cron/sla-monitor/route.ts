/**
 * GET /api/cron/sla-monitor
 *
 * Vercel Cron — roda a cada hora.
 * Para cada card com SLA ativo cujo prazo foi violado:
 *   → Cria notificação in-app para atendimento e sócias da organização
 *
 * Anti-spam: máximo 1 notificação por card por violação por 12h.
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { calcSla } from '@/lib/sla'
import { buscarEmailsEquipe, enviarEmail } from '@/lib/email'

const ANTI_SPAM_HORAS = 12

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = new Date()
  const antiSpamCutoff = new Date(agora.getTime() - ANTI_SPAM_HORAS * 60 * 60 * 1000).toISOString()

  const { data: orgs } = await service.from('organizacoes').select('id')
  if (!orgs?.length) return NextResponse.json({ alertas: 0 })

  let totalAlertas = 0
  const erros: string[] = []

  for (const org of orgs) {
    try {
      // Cards elegíveis: SLA ativo, status relevante, não concluídos/cancelados
      const { data: cards, error } = await service
        .from('cards')
        .select(`
          id, titulo, status, created_at, sla_iniciado_em, organization_id,
          cliente:clientes!cliente_id(nome),
          tipo:tipos_demanda!tipo_id(
            nome,
            sla_ativo,
            sla_prazo_inicio_horas,
            sla_prazo_resposta_horas
          )
        `)
        .eq('organization_id', org.id)
        .in('status', ['a_fazer', 'aguardando_info', 'em_andamento'])

      if (error || !cards?.length) continue

      // Anti-spam: cards já notificados nas últimas ANTI_SPAM_HORAS
      const cardIds = cards.map((c) => c.id)
      const { data: recentes } = await service
        .from('audit_log')
        .select('entidade_id')
        .eq('organization_id', org.id)
        .eq('acao', 'sla.violado_notificado')
        .in('entidade_id', cardIds)
        .gte('created_at', antiSpamCutoff)

      const jaNotificados = new Set((recentes ?? []).map((r) => r.entidade_id))

      // Filtrar violações reais
      const violados = cards.filter((card) => {
        if (jaNotificados.has(card.id)) return false
        const tipo = card.tipo as unknown as {
          sla_ativo: boolean
          sla_prazo_inicio_horas: number | null
          sla_prazo_resposta_horas: number | null
        } | null
        if (!tipo?.sla_ativo) return false

        let info = null
        if (card.status === 'a_fazer' || card.status === 'aguardando_info') {
          info = calcSla(card.created_at, tipo.sla_prazo_inicio_horas, agora)
        } else if (card.status === 'em_andamento') {
          info = calcSla(
            card.sla_iniciado_em as string | null,
            tipo.sla_prazo_resposta_horas,
            agora,
          )
        }

        return info?.status === 'violado'
      })

      if (!violados.length) continue

      // Destinatários: sócias + atendimento
      const emails = await buscarEmailsEquipe(org.id, ['socia', 'atendimento'])

      // Buscar IDs dos perfis de socia + atendimento para notif in-app
      const { data: perfis } = await service
        .from('profiles')
        .select('id')
        .eq('organization_id', org.id)
        .in('papel', ['socia', 'atendimento'])

      await Promise.all(
        violados.map(async (card) => {
          try {
            type CardRow = typeof card & {
              titulo: string
              cliente: { nome: string }
              tipo: { nome: string; sla_ativo: boolean; sla_prazo_inicio_horas: number | null; sla_prazo_resposta_horas: number | null }
            }
            const c = card as unknown as CardRow

            // Notificações in-app
            if (perfis?.length) {
              await service.from('in_app_notificacoes').insert(
                perfis.map((p) => ({
                  organization_id: org.id,
                  usuario_id: p.id,
                  tipo: 'prazo_vencido' as const,
                  titulo: `SLA violado: ${c.titulo}`,
                  mensagem: `O card "${c.titulo}" (${c.cliente?.nome ?? ''}) ultrapassou o prazo de SLA.`,
                  link: `/board?card=${card.id}`,
                })),
              )
            }

            // Email best-effort
            if (emails.length) {
              const subject = `⏰ SLA violado: ${c.titulo}`
              const html = `
                <p>O card <strong>${c.titulo}</strong> do cliente <strong>${c.cliente?.nome ?? ''}</strong>
                ultrapassou o prazo de SLA configurado para o tipo <strong>${c.tipo?.nome ?? ''}</strong>.</p>
                <p>Status atual: <strong>${card.status}</strong></p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/board?card=${card.id}">
                  Ver no Board →
                </a></p>
              `
              await Promise.all(emails.map((email) => enviarEmail(email, subject, html)))
            }

            // Anti-spam log
            await service.from('audit_log').insert({
              organization_id: org.id,
              usuario_id: null,
              acao: 'sla.violado_notificado',
              entidade: 'card',
              entidade_id: card.id,
              metadata: { status: card.status, destinatarios: emails.length },
            })

            totalAlertas++
          } catch (err) {
            console.error('[cron/sla-monitor] card:', card.id, err)
            erros.push(card.id)
          }
        }),
      )
    } catch (err) {
      console.error('[cron/sla-monitor] org:', org.id, err)
    }
  }

  console.log(`[cron/sla-monitor] Violações notificadas: ${totalAlertas}`)
  return NextResponse.json({ alertas: totalAlertas, erros: erros.length ? erros : undefined })
}
