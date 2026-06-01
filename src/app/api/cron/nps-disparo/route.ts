/**
 * Cron: /api/cron/nps-disparo
 * Schedule: "0 8 5 * *" — dia 5 de cada mês às 08h UTC
 *
 * Para cada cliente ativo:
 *  1. Cria registro em avaliacoes_cliente com token único
 *  2. Envia email com link para o formulário público
 *
 * Anti-spam: via audit_log (máx 1 disparo por cliente por mês).
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarEmailsResponsaveis, enviarEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('Authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const { data: orgs } = await supabase.from('organizacoes').select('id')

  let enviados = 0
  let pulados = 0

  for (const org of orgs ?? []) {
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('organization_id', org.id)
      .eq('status', 'ativo')

    for (const c of clientes ?? []) {
      // Anti-spam: verifica se já disparamos NPS este mês para este cliente
      const { count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('acao', 'nps.disparo')
        .eq('entidade', 'clientes')
        .eq('entidade_id', c.id)
        .gte('created_at', inicioMes)

      if ((count ?? 0) > 0) {
        pulados++
        continue
      }

      // Cria o registro de avaliação (token gerado pelo banco via DEFAULT gen_random_uuid())
      const { data: avaliacao, error } = await supabase
        .from('avaliacoes_cliente')
        .insert({
          organization_id: org.id,
          cliente_id: c.id,
        })
        .select('token_unico')
        .single()

      if (error || !avaliacao) {
        console.error(`[nps-disparo] Erro ao criar avaliação para ${c.id}:`, error)
        continue
      }

      const link = `${APP_URL}/avaliacoes/${avaliacao.token_unico}`
      const emails = await buscarEmailsResponsaveis(c.id, org.id)

      if (!emails.length) {
        pulados++
        continue
      }

      const subject = `${c.nome}, como estamos nos saindo? 💜`
      const html = emailNpsConvite({ clienteNome: c.nome, link })

      await enviarEmail(emails, subject, html)

      await supabase.from('audit_log').insert({
        organization_id: org.id,
        acao: 'nps.disparo',
        entidade: 'clientes',
        entidade_id: c.id,
        metadata: { token: avaliacao.token_unico, emails: emails.length },
      })

      enviados++
    }
  }

  return NextResponse.json({ ok: true, enviados, pulados })
}

// ---------------------------------------------------------------------------
// Template de email — convite NPS
// ---------------------------------------------------------------------------

function emailNpsConvite(opts: { clienteNome: string; link: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr>
        <td style="background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);border-radius:16px 16px 0 0;padding:20px 32px">
          <table width="100%"><tr>
            <td><span style="font-size:18px;font-weight:700;color:#fff">Simplizzia</span></td>
            <td align="right"><span style="font-size:11px;color:rgba(255,255,255,.75)">por Izzi</span></td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:32px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">Oi, ${opts.clienteNome}! 💜</p>
          <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
            Trabalhamos com muito carinho em cada entrega e adoraríamos saber o que você está achando.
            Sua opinião nos ajuda a melhorar — e leva menos de 2 minutos!
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#4B5563;line-height:1.6">
            Clique no botão abaixo para responder nossa pesquisa rápida:
          </p>
          <a href="${opts.link}" style="display:inline-block;background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:12px">Responder pesquisa →</a>
          <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF">
            Ou acesse: <a href="${opts.link}" style="color:#A046C6;word-break:break-all">${opts.link}</a>
          </p>
          <hr style="border:none;border-top:1px solid #F4F4F4;margin:28px 0 20px">
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center">
            Izzi · Assistente da Simplizzia ·
            <a href="${appUrl}" style="color:#A046C6;text-decoration:none">app.simplizzia.com.br</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table></body></html>`
}
