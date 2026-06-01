/**
 * GET /api/cron/em-andamento-parado
 *
 * Vercel Cron — roda a cada 6 horas.
 * Regra 2 do Motor de Automação (gatilho: em_andamento_72h).
 *
 * Para cada card em "em_andamento" sem atualização há 72h+:
 *   → Alerta para o time de gestão
 *
 * Anti-spam: máximo 1 alerta por card a cada 24h.
 * Respeita a flag `ativa` em automation_rules por organização.
 *
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buscarEmailsEquipe,
  enviarEmail,
  emailCardParado,
} from '@/lib/email'
import { verificarRegraAtiva, logAutomacao } from '@/lib/automacao'

const GATILHO = 'em_andamento_72h'
const HORAS_LIMITE = 72
const HORAS_ANTI_SPAM = 24

export async function GET(req: NextRequest) {
  // ── Autenticação ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = Date.now()
  const cutoff = new Date(agora - HORAS_LIMITE * 60 * 60 * 1000).toISOString()
  const antiSpamCutoff = new Date(agora - HORAS_ANTI_SPAM * 60 * 60 * 1000).toISOString()

  // ── Organizações ──────────────────────────────────────────────────────────
  const { data: orgs } = await service.from('organizacoes').select('id')
  if (!orgs?.length) return NextResponse.json({ alertas: 0 })

  let totalAlertas = 0
  const erros: string[] = []

  for (const org of orgs) {
    const { regra_id, ativa } = await verificarRegraAtiva(org.id, GATILHO)
    if (!ativa) continue

    // ── Cards elegíveis ───────────────────────────────────────────────────
    const { data: cards, error } = await service
      .from('cards')
      .select(`
        id, titulo, organization_id, cliente_id, updated_at,
        cliente:clientes!cliente_id(nome)
      `)
      .eq('organization_id', org.id)
      .eq('status', 'em_andamento')
      .lt('updated_at', cutoff)

    if (error) {
      console.error('[cron/em-andamento-parado] query:', error.message)
      continue
    }
    if (!cards?.length) continue

    // ── Anti-spam ─────────────────────────────────────────────────────────
    const cardIds = cards.map((c) => c.id)
    const { data: recentes } = await service
      .from('audit_log')
      .select('entidade_id')
      .eq('organization_id', org.id)
      .eq('acao', 'email.em_andamento_parado')
      .in('entidade_id', cardIds)
      .gte('created_at', antiSpamCutoff)

    const jaNotificados = new Set((recentes ?? []).map((r) => r.entidade_id))
    const elegíveis = cards.filter((c) => !jaNotificados.has(c.id))
    if (!elegíveis.length) continue

    // ── Buscar emails da gestão ───────────────────────────────────────────
    const emailsGestao = await buscarEmailsEquipe(org.id, ['gestao', 'socia', 'atendimento'])
    if (!emailsGestao.length) continue

    await Promise.all(
      elegíveis.map(async (card) => {
        try {
          type CardRow = typeof card & { titulo: string; cliente: { nome: string } }
          const c = card as unknown as CardRow

          const horas = Math.floor(
            (agora - new Date(card.updated_at as string).getTime()) / (1000 * 60 * 60),
          )

          await Promise.all(
            emailsGestao.map((email) => {
              const { subject, html } = emailCardParado({
                destinatarioNome: 'Gestão',
                cardTitulo: c.titulo,
                clienteNome: c.cliente?.nome ?? '',
                horas,
              })
              return enviarEmail(email, subject, html)
            }),
          )

          // Anti-spam log
          await service.from('audit_log').insert({
            organization_id: org.id,
            usuario_id: null,
            acao: 'email.em_andamento_parado',
            entidade: 'card',
            entidade_id: card.id,
            metadata: { horas, destinatarios: emailsGestao.length },
          })

          // Automation log
          if (regra_id) {
            await logAutomacao({
              organizationId: org.id,
              regra_id,
              entidade: 'card',
              entidade_id: card.id,
              sucesso: true,
              detalhes: { horas, destinatarios: emailsGestao.length },
            })
          }

          totalAlertas++
        } catch (err) {
          console.error('[cron/em-andamento-parado] card:', card.id, err)
          erros.push(card.id)
          if (regra_id) {
            await logAutomacao({
              organizationId: org.id,
              regra_id,
              entidade: 'card',
              entidade_id: card.id,
              sucesso: false,
              detalhes: { erro: String(err) },
            })
          }
        }
      }),
    )
  }

  console.log(`[cron/em-andamento-parado] Alertas: ${totalAlertas}`)
  return NextResponse.json({ alertas: totalAlertas, erros: erros.length ? erros : undefined })
}
