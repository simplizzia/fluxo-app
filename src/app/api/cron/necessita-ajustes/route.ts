/**
 * GET /api/cron/necessita-ajustes
 *
 * Vercel Cron — roda a cada 6 horas.
 * Regra 6 do Motor de Automação (gatilho: necessita_ajustes_24h).
 *
 * Para cada card em "necessita_ajustes" há 24h+ sem atualização:
 *   → Lembrete ao responsável pelo card (responsavel_id)
 *   → Fallback: notifica atendimento se sem responsável
 *
 * Anti-spam: máximo 1 lembrete por card a cada 24h.
 * Respeita a flag `ativa` em automation_rules por organização.
 *
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buscarInfoPerfilPorId,
  buscarEmailsEquipe,
  enviarEmail,
  emailLembreteAjustes,
} from '@/lib/email'
import { verificarRegraAtiva, logAutomacao } from '@/lib/automacao'

const GATILHO = 'necessita_ajustes_24h'
const HORAS_LIMITE = 24
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
  if (!orgs?.length) return NextResponse.json({ lembretes: 0 })

  let totalLembretes = 0
  const erros: string[] = []

  for (const org of orgs) {
    const { regra_id, ativa } = await verificarRegraAtiva(org.id, GATILHO)
    if (!ativa) continue

    // ── Cards elegíveis ───────────────────────────────────────────────────
    const { data: cards, error } = await service
      .from('cards')
      .select(`
        id, titulo, organization_id, cliente_id, responsavel_id, updated_at,
        cliente:clientes!cliente_id(nome)
      `)
      .eq('organization_id', org.id)
      .eq('status', 'necessita_ajustes')
      .lt('updated_at', cutoff)

    if (error) {
      console.error('[cron/necessita-ajustes] query:', error.message)
      continue
    }
    if (!cards?.length) continue

    // ── Anti-spam ─────────────────────────────────────────────────────────
    const cardIds = cards.map((c) => c.id)
    const { data: recentes } = await service
      .from('audit_log')
      .select('entidade_id')
      .eq('organization_id', org.id)
      .eq('acao', 'email.necessita_ajustes_lembrete')
      .in('entidade_id', cardIds)
      .gte('created_at', antiSpamCutoff)

    const jaNotificados = new Set((recentes ?? []).map((r) => r.entidade_id))
    const elegíveis = cards.filter((c) => !jaNotificados.has(c.id))
    if (!elegíveis.length) continue

    await Promise.all(
      elegíveis.map(async (card) => {
        try {
          type CardRow = typeof card & {
            titulo: string
            responsavel_id: string | null
            cliente: { nome: string }
          }
          const c = card as unknown as CardRow

          const horas = Math.floor(
            (agora - new Date(card.updated_at as string).getTime()) / (1000 * 60 * 60),
          )

          let destinatarioEmail: string | null = null
          let destinatarioNome = 'Responsável'

          // Tenta notificar o responsável do card
          if (c.responsavel_id) {
            const perfil = await buscarInfoPerfilPorId(c.responsavel_id)
            if (perfil) {
              destinatarioEmail = perfil.email
              destinatarioNome = perfil.nome
            }
          }

          // Fallback: atendimento
          if (!destinatarioEmail) {
            const atendimento = await buscarEmailsEquipe(org.id, ['atendimento'])
            destinatarioEmail = atendimento[0] ?? null
            destinatarioNome = 'Time de Atendimento'
          }

          if (!destinatarioEmail) return

          const { subject, html } = emailLembreteAjustes({
            destinatarioNome,
            cardTitulo: c.titulo,
            clienteNome: c.cliente?.nome ?? '',
            horas,
          })
          await enviarEmail(destinatarioEmail, subject, html)

          // Anti-spam log
          await service.from('audit_log').insert({
            organization_id: org.id,
            usuario_id: null,
            acao: 'email.necessita_ajustes_lembrete',
            entidade: 'card',
            entidade_id: card.id,
            metadata: { horas, destinatario: destinatarioEmail },
          })

          // Automation log
          if (regra_id) {
            await logAutomacao({
              organizationId: org.id,
              regra_id,
              entidade: 'card',
              entidade_id: card.id,
              sucesso: true,
              detalhes: { horas, destinatario: destinatarioEmail },
            })
          }

          totalLembretes++
        } catch (err) {
          console.error('[cron/necessita-ajustes] card:', card.id, err)
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

  console.log(`[cron/necessita-ajustes] Lembretes: ${totalLembretes}`)
  return NextResponse.json({ lembretes: totalLembretes, erros: erros.length ? erros : undefined })
}
