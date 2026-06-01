/**
 * GET /api/cron/financeiro-alerta
 *
 * Vercel Cron — roda no dia 5 de cada mês às 9h.
 * Para cada receita ativa em atraso há mais de 7 dias:
 *   → Cria notificação in-app para as sócias
 *   → Envia email (best-effort)
 *
 * Anti-spam: máximo 1 alerta por receita por mês.
 * Autorização: Bearer ${CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarEmailsEquipe, enviarEmail } from '@/lib/email'
import { formatBRL } from '@/lib/financeiro'

const DIAS_ATRASO_MIN = 7

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = new Date()
  const cutoffAtraso = new Date(agora.getTime() - DIAS_ATRASO_MIN * 24 * 60 * 60 * 1000).toISOString()

  // Anti-spam: um alerta por receita por mês
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const { data: orgs } = await service.from('organizacoes').select('id')
  if (!orgs?.length) return NextResponse.json({ alertas: 0 })

  let totalAlertas = 0

  for (const org of orgs) {
    try {
      const { data: receitasAtrasadas } = await service
        .from('financeiro_receitas')
        .select(`
          id, descricao, valor_mensal, ultima_atualizacao_status,
          cliente:clientes!cliente_id(nome)
        `)
        .eq('organization_id', org.id)
        .eq('ativo', true)
        .eq('status', 'em_atraso')
        .lt('ultima_atualizacao_status', cutoffAtraso)

      if (!receitasAtrasadas?.length) continue

      // Anti-spam: já alertado este mês?
      const ids = receitasAtrasadas.map((r) => r.id)
      const { data: jaAlertados } = await service
        .from('audit_log')
        .select('entidade_id')
        .eq('organization_id', org.id)
        .eq('acao', 'financeiro.atraso_notificado')
        .in('entidade_id', ids)
        .gte('created_at', inicioMes)

      const jaNotificados = new Set((jaAlertados ?? []).map((r) => r.entidade_id))
      const elegíveis = receitasAtrasadas.filter((r) => !jaNotificados.has(r.id))
      if (!elegíveis.length) continue

      // Busca perfis de sócias para in-app
      const { data: socias } = await service
        .from('profiles')
        .select('id')
        .eq('organization_id', org.id)
        .eq('papel', 'socia')

      const emails = await buscarEmailsEquipe(org.id, ['socia'])

      await Promise.all(
        elegíveis.map(async (receita) => {
          type ReceitaRow = typeof receita & { cliente: { nome: string } | null }
          const r = receita as unknown as ReceitaRow
          const clienteNome = r.cliente?.nome ?? 'Cliente não vinculado'
          const valorFormatado = formatBRL(Number(r.valor_mensal))

          // Notif in-app para sócias
          if (socias?.length) {
            await service.from('in_app_notificacoes').insert(
              socias.map((s) => ({
                organization_id: org.id,
                usuario_id: s.id,
                tipo: 'geral' as const,
                titulo: `Inadimplência: ${clienteNome}`,
                mensagem: `Receita "${r.descricao}" (${valorFormatado}/mês) está em atraso há mais de ${DIAS_ATRASO_MIN} dias.`,
                link: `/socias/financeiro`,
              })),
            )
          }

          // Email
          if (emails.length) {
            const subject = `💸 Inadimplência: ${clienteNome}`
            const html = `
              <p>A receita <strong>${r.descricao}</strong> do cliente <strong>${clienteNome}</strong>
              está marcada como <strong>em atraso</strong> há mais de ${DIAS_ATRASO_MIN} dias.</p>
              <p>Valor: <strong>${valorFormatado}/mês</strong></p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/socias/financeiro">
                Ver no módulo financeiro →
              </a></p>
            `
            await Promise.all(emails.map((email) => enviarEmail(email, subject, html)))
          }

          // Anti-spam log
          await service.from('audit_log').insert({
            organization_id: org.id,
            usuario_id: null,
            acao: 'financeiro.atraso_notificado',
            entidade: 'financeiro_receita',
            entidade_id: receita.id,
            metadata: { cliente: clienteNome, valor: r.valor_mensal },
          })

          totalAlertas++
        }),
      )
    } catch (err) {
      console.error('[cron/financeiro-alerta] org:', org.id, err)
    }
  }

  return NextResponse.json({ alertas: totalAlertas })
}
