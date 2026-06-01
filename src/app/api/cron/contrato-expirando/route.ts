/**
 * GET /api/cron/contrato-expirando
 *
 * Vercel Cron — roda diariamente às 9h.
 * Regra 10 do Motor de Automação (gatilho: contrato_expirando_30d).
 *
 * Para cada cliente cujo plano (data_renovacao) expira em ≤ 45 dias:
 *   → Alerta para sócias
 *
 * Anti-spam: máximo 1 alerta por cliente a cada 7 dias.
 * Respeita a flag `ativa` em automation_rules por organização.
 *
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buscarEmailsEquipe,
  buscarInfoPerfilPorId,
  enviarEmail,
  emailContratoExpirando,
} from '@/lib/email'
import { verificarRegraAtiva, logAutomacao } from '@/lib/automacao'

const GATILHO = 'contrato_expirando_30d'
const DIAS_AVISO = 45
const DIAS_ANTI_SPAM = 7

export async function GET(req: NextRequest) {
  // ── Autenticação ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = new Date()

  // Janela: hoje até +30 dias
  const hoje = agora.toISOString().split('T')[0]
  const limite = new Date(agora)
  limite.setDate(limite.getDate() + DIAS_AVISO)
  const limiteDateStr = limite.toISOString().split('T')[0]

  // Anti-spam cutoff: 7 dias atrás
  const antiSpamCutoff = new Date(agora)
  antiSpamCutoff.setDate(antiSpamCutoff.getDate() - DIAS_ANTI_SPAM)

  // ── Organizações ──────────────────────────────────────────────────────────
  const { data: orgs } = await service.from('organizacoes').select('id')
  if (!orgs?.length) return NextResponse.json({ alertas: 0 })

  let totalAlertas = 0
  const erros: string[] = []

  for (const org of orgs) {
    const { regra_id, ativa } = await verificarRegraAtiva(org.id, GATILHO)
    if (!ativa) continue

    // ── Planos expirando nos próximos 30 dias ─────────────────────────────
    const { data: planos, error } = await service
      .from('planos_cliente')
      .select(`
        id, cliente_id, data_renovacao,
        cliente:clientes!cliente_id(nome)
      `)
      .eq('organization_id', org.id)
      .gte('data_renovacao', hoje)
      .lte('data_renovacao', limiteDateStr)

    if (error) {
      console.error('[cron/contrato-expirando] query:', error.message)
      continue
    }
    if (!planos?.length) continue

    // ── Anti-spam ─────────────────────────────────────────────────────────
    const clienteIds = planos.map((p) => p.cliente_id)
    const { data: recentes } = await service
      .from('audit_log')
      .select('entidade_id')
      .eq('organization_id', org.id)
      .eq('acao', 'email.contrato_expirando')
      .in('entidade_id', clienteIds)
      .gte('created_at', antiSpamCutoff.toISOString())

    const jaNotificados = new Set((recentes ?? []).map((r) => r.entidade_id))
    const elegíveis = planos.filter((p) => !jaNotificados.has(p.cliente_id))
    if (!elegíveis.length) continue

    // ── Emails das sócias ─────────────────────────────────────────────────
    const emailsSocias = await buscarEmailsEquipe(org.id, ['socia'])
    if (!emailsSocias.length) continue

    // Busca infos das sócias para personalizar o email
    const { data: socias } = await service
      .from('profiles')
      .select('id, user_id, nome')
      .eq('organization_id', org.id)
      .eq('papel', 'socia')

    await Promise.all(
      elegíveis.map(async (plano) => {
        try {
          type PlanoRow = typeof plano & {
            data_renovacao: string
            cliente: { nome: string }
          }
          const p = plano as unknown as PlanoRow

          const dataRenovacao = new Date(p.data_renovacao)
          const diasRestantes = Math.ceil(
            (dataRenovacao.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
          )
          const dataFormatada = dataRenovacao.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })

          const clienteNome = p.cliente?.nome ?? 'Cliente'

          // Envia para cada sócia nominalmente
          await Promise.all(
            emailsSocias.map(async (email, idx) => {
              const nome = (socias ?? [])[idx]?.nome ?? 'Sócia'
              const { subject, html } = emailContratoExpirando({
                destinatarioNome: nome,
                clienteNome,
                dias: diasRestantes,
                dataRenovacao: dataFormatada,
              })
              return enviarEmail(email, subject, html)
            }),
          )

          // Anti-spam log
          await service.from('audit_log').insert({
            organization_id: org.id,
            usuario_id: null,
            acao: 'email.contrato_expirando',
            entidade: 'cliente',
            entidade_id: plano.cliente_id,
            metadata: { diasRestantes, dataRenovacao: p.data_renovacao },
          })

          // Automation log
          if (regra_id) {
            await logAutomacao({
              organizationId: org.id,
              regra_id,
              entidade: 'cliente',
              entidade_id: plano.cliente_id,
              sucesso: true,
              detalhes: { diasRestantes, dataRenovacao: p.data_renovacao, clienteNome },
            })
          }

          totalAlertas++
        } catch (err) {
          console.error('[cron/contrato-expirando] cliente:', plano.cliente_id, err)
          erros.push(plano.cliente_id)
          if (regra_id) {
            await logAutomacao({
              organizationId: org.id,
              regra_id,
              entidade: 'cliente',
              entidade_id: plano.cliente_id,
              sucesso: false,
              detalhes: { erro: String(err) },
            })
          }
        }
      }),
    )
  }

  console.log(`[cron/contrato-expirando] Alertas: ${totalAlertas}`)
  return NextResponse.json({ alertas: totalAlertas, erros: erros.length ? erros : undefined })
}
