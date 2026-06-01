/**
 * GET /api/cron/lembrete-aguardando
 *
 * Vercel Cron — roda a cada 6 horas.
 * Regra 1 do Motor de Automação (gatilho: aguardando_info_48h).
 *
 * Para cada card em "aguardando_info" há mais de 48h sem atualização:
 *   → Notifica o time de atendimento
 *   → Envia lembrete ao responsável do cliente
 *
 * Anti-spam: máximo 1 disparo por card a cada 24h (via audit_log).
 * Respeita a flag `ativa` em automation_rules por organização.
 *
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buscarInfoResponsaveis,
  buscarEmailsEquipe,
  enviarEmail,
  emailLembreteAguardando,
} from '@/lib/email'
import { verificarRegraAtiva, logAutomacao } from '@/lib/automacao'

const GATILHO = 'aguardando_info_48h'
const HORAS_LIMITE = 48
const HORAS_ANTI_SPAM = 24

export async function GET(req: NextRequest) {
  // ── Autenticação ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = Date.now()
  const cutoff = new Date(agora - HORAS_LIMITE * 60 * 60 * 1000).toISOString()
  const antiSpamCutoff = new Date(agora - HORAS_ANTI_SPAM * 60 * 60 * 1000).toISOString()

  // ── 1. Organizações ───────────────────────────────────────────────────────
  const { data: orgs } = await service.from('organizacoes').select('id')
  if (!orgs?.length) return NextResponse.json({ enviados: 0 })

  let totalEnviados = 0
  const erros: string[] = []

  for (const org of orgs) {
    // Verificar se a regra está ativa para esta org
    const { regra_id, ativa } = await verificarRegraAtiva(org.id, GATILHO)
    if (!ativa) continue

    // ── 2. Cards elegíveis ────────────────────────────────────────────────
    const { data: cards, error: cardsError } = await service
      .from('cards')
      .select(`
        id, titulo, organization_id, cliente_id, updated_at,
        cliente:clientes!cliente_id(nome)
      `)
      .eq('organization_id', org.id)
      .eq('status', 'aguardando_info')
      .lt('updated_at', cutoff)

    if (cardsError) {
      console.error('[cron/lembrete-aguardando] query:', cardsError.message)
      continue
    }
    if (!cards?.length) continue

    // ── 3. Anti-spam: remove cards já notificados nas últimas 24h ─────────
    const cardIds = cards.map((c) => c.id)
    const { data: recentes } = await service
      .from('audit_log')
      .select('entidade_id')
      .eq('organization_id', org.id)
      .eq('acao', 'email.lembrete_aguardando')
      .in('entidade_id', cardIds)
      .gte('created_at', antiSpamCutoff)

    const jaNotificados = new Set((recentes ?? []).map((r) => r.entidade_id))
    const elegíveis = cards.filter((c) => !jaNotificados.has(c.id))
    if (!elegíveis.length) continue

    // ── 4. Emails por card ────────────────────────────────────────────────
    const emailsAtendimento = await buscarEmailsEquipe(org.id, ['atendimento'])

    await Promise.all(
      elegíveis.map(async (card) => {
        try {
          type CardRow = typeof card & { titulo: string; cliente: { nome: string } }
          const c = card as unknown as CardRow

          const horas = Math.floor(
            (agora - new Date(card.updated_at as string).getTime()) / (1000 * 60 * 60),
          )

          // Notifica atendimento
          await Promise.all(
            emailsAtendimento.map((email) =>
              enviarEmail(
                email,
                `⏰ Aguardando há ${horas}h: ${c.titulo}`,
                emailLembreteAguardando({
                  destinatarioNome: 'Time de Atendimento',
                  cardTitulo: c.titulo,
                  clienteNome: c.cliente?.nome ?? '',
                  horas,
                }).html,
              ),
            ),
          )

          // Notifica responsáveis do cliente
          const responsaveis = await buscarInfoResponsaveis(card.cliente_id!, org.id)
          await Promise.all(
            responsaveis.map(({ email, nome }) => {
              const { subject, html } = emailLembreteAguardando({
                destinatarioNome: nome,
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
            acao: 'email.lembrete_aguardando',
            entidade: 'card',
            entidade_id: card.id,
            metadata: { horas, destinatarios_atendimento: emailsAtendimento.length, destinatarios_cliente: responsaveis.length },
          })

          // Automation log
          if (regra_id) {
            await logAutomacao({
              organizationId: org.id,
              regra_id,
              entidade: 'card',
              entidade_id: card.id,
              sucesso: true,
              detalhes: { horas, atendimento: emailsAtendimento.length, clientes: responsaveis.length },
            })
          }

          totalEnviados++
        } catch (err) {
          console.error('[cron/lembrete-aguardando] card:', card.id, err)
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

  console.log(`[cron/lembrete-aguardando] Enviados: ${totalEnviados}`)
  return NextResponse.json({
    enviados: totalEnviados,
    erros: erros.length ? erros : undefined,
  })
}
