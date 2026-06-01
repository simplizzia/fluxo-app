'use server'

import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarEmailsEquipe, enviarEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function actionResponderAvaliacao(
  token: string,
  data: {
    nps: number
    qualidade: number
    comunicacao: number
    comentario: string
  },
): Promise<void> {
  const supabase = createServiceClient()

  // Busca a avaliação pelo token
  const { data: avaliacao } = await supabase
    .from('avaliacoes_cliente')
    .select('id, organization_id, respondido_em, clientes(nome)')
    .eq('token_unico', token)
    .maybeSingle()

  // Não encontrado ou já respondido → vai para obrigado de qualquer forma
  if (!avaliacao || avaliacao.respondido_em) {
    redirect('/avaliacoes/obrigado')
  }

  // Grava a resposta — .is('respondido_em', null) previne double-submit
  const { error } = await supabase
    .from('avaliacoes_cliente')
    .update({
      nps: data.nps,
      qualidade: data.qualidade,
      comunicacao: data.comunicacao,
      comentario: data.comentario || null,
      respondido_em: new Date().toISOString(),
    })
    .eq('token_unico', token)
    .is('respondido_em', null)

  if (error) {
    console.error('[nps] Erro ao registrar resposta:', error)
  }

  // Alerta imediato para a sócia se NPS <= 6 (detrator)
  if (data.nps <= 6) {
    const orgId = avaliacao.organization_id as string
    const clienteNome = (avaliacao.clientes as unknown as { nome: string } | null)?.nome ?? 'Cliente'
    const emails = await buscarEmailsEquipe(orgId, ['socia'])

    if (emails.length) {
      await enviarEmail(
        emails,
        `⚠️ NPS baixo: ${clienteNome} deu nota ${data.nps}/10`,
        emailNpsAlerta({ clienteNome, nps: data.nps, comentario: data.comentario }),
      )
    }
  }

  redirect('/avaliacoes/obrigado')
}

// ---------------------------------------------------------------------------
// Template de email — alerta NPS baixo (inline, para manter isolamento)
// ---------------------------------------------------------------------------

function emailNpsAlerta(opts: {
  clienteNome: string
  nps: number
  comentario: string
}): string {
  const corBadge =
    opts.nps <= 3 ? '#EF4444' : opts.nps <= 5 ? '#F97316' : '#F59E0B'
  const rotulos = ['Péssima', '', '', 'Ruim', '', '', 'Regular', '', '', 'Boa', 'Excelente']

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
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">⚠️ Alerta: NPS baixo</p>
          <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
            O cliente <strong>${opts.clienteNome}</strong> respondeu à pesquisa NPS com nota baixa.
          </p>
          <div style="background:#FEF2F2;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px">
            <p style="margin:0 0 4px;font-size:40px;font-weight:800;color:${corBadge}">${opts.nps}<span style="font-size:16px;font-weight:400;color:#9CA3AF">/10</span></p>
            <p style="margin:0;font-size:12px;color:#9CA3AF">${rotulos[opts.nps] ?? ''}</p>
          </div>
          ${
            opts.comentario
              ? `<div style="background:#F9FAFB;border-left:3px solid #E5E7EB;border-radius:4px;padding:12px 16px;margin-bottom:16px">
                   <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">Comentário do cliente</p>
                   <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${opts.comentario}</p>
                 </div>`
              : ''
          }
          <p style="margin:0;font-size:14px;color:#4B5563;line-height:1.6">
            Vale entrar em contato para entender melhor e reverter a situação. 💜
          </p>
          <a href="${APP_URL}/cs" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:12px">Ver Customer Success →</a>
          <hr style="border:none;border-top:1px solid #F4F4F4;margin:28px 0 20px">
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center">
            Izzi · Assistente da Simplizzia ·
            <a href="${APP_URL}" style="color:#A046C6;text-decoration:none">app.simplizzia.com.br</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table></body></html>`
}
