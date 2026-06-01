/**
 * Email — Simplizzia OS
 *
 * Utilitários de envio via Resend.
 * Todas as funções são best-effort: falhas são logadas mas nunca propagadas.
 * Izzi assina todos os emails.
 */
import 'server-only'

import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Izzi da Simplizzia'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'falecomaizzi@simplizzia.com.br'
const FROM = `${FROM_NAME} <${FROM_EMAIL}>`

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Busca de destinatários
// ---------------------------------------------------------------------------

/** Email de um usuário via Auth Admin API (usa service role). */
export async function buscarEmailUsuario(userId: string): Promise<string | null> {
  try {
    const service = createServiceClient()
    const { data: { user } } = await service.auth.admin.getUserById(userId)
    return user?.email ?? null
  } catch {
    return null
  }
}

/** Emails dos contatos com sub_papel = 'responsavel' de um cliente. */
export async function buscarEmailsResponsaveis(
  clienteId: string,
  organizationId: string,
): Promise<string[]> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('contatos_cliente')
      .select('user_id')
      .eq('cliente_id', clienteId)
      .eq('organization_id', organizationId)
      .eq('sub_papel', 'responsavel')
      .eq('ativo', true)

    if (!data?.length) return []
    const emails = await Promise.all(data.map((c) => buscarEmailUsuario(c.user_id)))
    return emails.filter((e): e is string => !!e)
  } catch {
    return []
  }
}

/**
 * Info (email + nome) dos responsáveis de um cliente.
 * Combina contatos_cliente + profiles + auth admin.
 */
export async function buscarInfoResponsaveis(
  clienteId: string,
  organizationId: string,
): Promise<{ email: string; nome: string }[]> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('contatos_cliente')
      .select('user_id')
      .eq('cliente_id', clienteId)
      .eq('organization_id', organizationId)
      .eq('sub_papel', 'responsavel')
      .eq('ativo', true)

    if (!data?.length) return []

    const results = await Promise.all(
      data.map(async (c) => {
        const [email, perfilRes] = await Promise.all([
          buscarEmailUsuario(c.user_id),
          service.from('profiles').select('nome').eq('user_id', c.user_id).maybeSingle(),
        ])
        const nome = (perfilRes.data as { nome: string } | null)?.nome ?? 'Cliente'
        return email ? { email, nome } : null
      }),
    )
    return results.filter((r): r is { email: string; nome: string } => r !== null)
  } catch {
    return []
  }
}

/**
 * Info (email + nome) de um perfil pelo seu id (PK da tabela profiles).
 * Útil para notificar o responsável/executor de um card.
 */
export async function buscarInfoPerfilPorId(
  profileId: string,
): Promise<{ email: string; nome: string } | null> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('profiles')
      .select('user_id, nome')
      .eq('id', profileId)
      .maybeSingle()

    if (!data) return null
    const email = await buscarEmailUsuario((data as { user_id: string; nome: string }).user_id)
    return email ? { email, nome: (data as { user_id: string; nome: string }).nome } : null
  } catch {
    return null
  }
}

/** Emails dos membros da equipe por papel (ex: ['socia', 'atendimento']). */
export async function buscarEmailsEquipe(
  organizationId: string,
  papeis: string[],
): Promise<string[]> {
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('papel', papeis as import('@/types/database').Database['public']['Enums']['papel_usuario'][])

    if (!data?.length) return []
    const emails = await Promise.all(data.map((p) => buscarEmailUsuario(p.user_id)))
    return emails.filter((e): e is string => !!e)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

/**
 * Envia email de forma resiliente.
 * Nunca lança — email é best-effort e não deve interromper o fluxo principal.
 */
export async function enviarEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  try {
    const toArray = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean)
    if (!toArray.length) return

    await resend.emails.send({ from: FROM, to: toArray, subject, html })
  } catch (err) {
    console.error('[email] Falha ao enviar:', subject, err)
  }
}

// ---------------------------------------------------------------------------
// Layout base
// ---------------------------------------------------------------------------

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <!-- Header com gradiente da Simplizzia -->
        <tr>
          <td style="background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);border-radius:16px 16px 0 0;padding:20px 32px">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td><span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.3px">Simplizzia</span></td>
              <td align="right"><span style="font-size:11px;color:rgba(255,255,255,0.75)">por Izzi</span></td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border-radius:0 0 16px 16px">
            ${content}
            <hr style="border:none;border-top:1px solid #F4F4F4;margin:28px 0 20px" />
            <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center">
              Izzi · Assistente da Simplizzia ·
              <a href="${APP_URL}" style="color:#A046C6;text-decoration:none">app.simplizzia.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:12px">${label}</a>`
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Notifica cliente que o conteúdo está pronto para aprovação. */
export function emailParaAprovacao(opts: {
  destinatarioNome: string
  cardTitulo: string
  clienteNome: string
  cardId: string   // deep-link para a página de aprovação
}): { subject: string; html: string } {
  const urlAprovacao = `${APP_URL}/aprovacao/${opts.cardId}`
  return {
    subject: `${opts.clienteNome}, seu conteúdo está pronto para aprovação`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        Oi, ${opts.destinatarioNome}! 👋
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O conteúdo <strong>"${opts.cardTitulo}"</strong> está pronto e aguardando a sua aprovação.
      </p>
      <p style="margin:0;font-size:14px;color:#4B5563;line-height:1.6">
        Toque no botão abaixo para ver a prévia e aprovar ou solicitar ajustes —
        funciona direto pelo celular! 📱
      </p>
      ${btn(urlAprovacao, 'Ver e aprovar →')}
      <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF">
        Ou acesse: <a href="${urlAprovacao}" style="color:#A046C6;word-break:break-all">${urlAprovacao}</a>
      </p>
    `),
  }
}

/** Notifica equipe (sócia + atendimento) que o card foi aprovado. */
export function emailCardAprovado(opts: {
  cardTitulo: string
  clienteNome: string
}): { subject: string; html: string } {
  return {
    subject: `✓ Aprovado: ${opts.cardTitulo}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">Boa notícia! 🎉</p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O cliente <strong>${opts.clienteNome}</strong> aprovou
        <strong>"${opts.cardTitulo}"</strong>.
        O card foi movido para <strong>Concluído</strong> automaticamente.
      </p>
      ${btn(`${APP_URL}/board`, 'Ver no board →')}
    `),
  }
}

/** Notifica executor + atendimento que o cliente pediu ajustes. */
export function emailCardReprovado(opts: {
  destinatarioNome: string
  cardTitulo: string
  clienteNome: string
  feedback: string
}): { subject: string; html: string } {
  return {
    subject: `↩ Ajustes solicitados: ${opts.cardTitulo}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        Oi, ${opts.destinatarioNome}!
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O cliente <strong>${opts.clienteNome}</strong> solicitou ajustes em
        <strong>"${opts.cardTitulo}"</strong>.
      </p>
      <div style="background:#FFF7ED;border-left:3px solid #F59E0B;border-radius:4px;padding:12px 16px;margin-bottom:8px">
        <p style="margin:0;font-size:11px;font-weight:600;color:#92400E;text-transform:uppercase;letter-spacing:0.05em">
          Feedback do cliente
        </p>
        <p style="margin:8px 0 0;font-size:14px;color:#78350F;line-height:1.6">${opts.feedback}</p>
      </div>
      ${btn(`${APP_URL}/board`, 'Ver card →')}
    `),
  }
}

/** Notifica equipe que um card foi cancelado. */
export function emailCardCancelado(opts: {
  cardTitulo: string
  clienteNome: string
  motivo: string
}): { subject: string; html: string } {
  return {
    subject: `Card cancelado: ${opts.cardTitulo}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">Card cancelado</p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O card <strong>"${opts.cardTitulo}"</strong> do cliente <strong>${opts.clienteNome}</strong>
        foi cancelado.
      </p>
      <div style="background:#FEF2F2;border-left:3px solid #EF4444;border-radius:4px;padding:12px 16px">
        <p style="margin:0;font-size:11px;font-weight:600;color:#991B1B;text-transform:uppercase;letter-spacing:0.05em">
          Motivo
        </p>
        <p style="margin:8px 0 0;font-size:14px;color:#7F1D1D;line-height:1.6">${opts.motivo}</p>
      </div>
      ${btn(`${APP_URL}/board`, 'Ver no board →')}
    `),
  }
}

/** Alerta para equipe quando cliente atinge 80% ou 100% do plano mensal. */
export function emailPlanoAlerta(opts: {
  clienteNome: string
  usados: number
  limite: number
  porcentagem: number
}): { subject: string; html: string } {
  const atingiu100 = opts.porcentagem >= 100
  const titulo = atingiu100
    ? `⚠️ Limite atingido: ${opts.clienteNome}`
    : `📊 ${opts.clienteNome} está em ${opts.porcentagem}% do plano`

  return {
    subject: titulo,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        ${atingiu100 ? 'Limite do plano atingido' : 'Alerta de uso do plano'}
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O cliente <strong>${opts.clienteNome}</strong> utilizou
        <strong>${opts.usados} de ${opts.limite}</strong> demandas este mês
        (<strong>${opts.porcentagem}%</strong> do plano).
      </p>
      ${
        atingiu100
          ? `<div style="background:#FEF2F2;border-left:3px solid #EF4444;border-radius:4px;padding:12px 16px">
               <p style="margin:0;font-size:14px;color:#7F1D1D;line-height:1.6">
                 Novas demandas criadas excedem o plano contratado. Considere uma conversa sobre upgrade ou aguardar a renovação.
               </p>
             </div>`
          : `<div style="background:#FFF7ED;border-left:3px solid #F59E0B;border-radius:4px;padding:12px 16px">
               <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6">
                 Restam <strong>${opts.limite - opts.usados}</strong> demandas disponíveis no plano deste mês.
               </p>
             </div>`
      }
      ${btn(`${APP_URL}/plano`, 'Ver uso do plano →')}
    `),
  }
}

/** Lembrete de card parado em Aguardando Informações há N horas. */
export function emailLembreteAguardando(opts: {
  destinatarioNome: string
  cardTitulo: string
  clienteNome: string
  horas: number
}): { subject: string; html: string } {
  return {
    subject: `⏰ Aguardando há ${opts.horas}h: ${opts.cardTitulo}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        Oi, ${opts.destinatarioNome}!
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O card <strong>"${opts.cardTitulo}"</strong> do cliente <strong>${opts.clienteNome}</strong>
        está em <strong>Aguardando informações</strong> há mais de ${opts.horas} horas sem atualização.
      </p>
      <p style="margin:0;font-size:14px;color:#4B5563">
        Vale dar uma atenção para não deixar o cliente esperando! 🙂
      </p>
      ${btn(`${APP_URL}/board`, 'Ver card →')}
    `),
  }
}

/** Alerta para gestão de card em andamento sem atualização há N horas. */
export function emailCardParado(opts: {
  destinatarioNome: string
  cardTitulo: string
  clienteNome: string
  horas: number
}): { subject: string; html: string } {
  return {
    subject: `🔔 Card parado há ${opts.horas}h: ${opts.cardTitulo}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        Oi, ${opts.destinatarioNome}!
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O card <strong>"${opts.cardTitulo}"</strong> do cliente <strong>${opts.clienteNome}</strong>
        está em <strong>Em andamento</strong> há mais de ${opts.horas} horas sem nenhuma atualização.
      </p>
      <div style="background:#FFF7ED;border-left:3px solid #F59E0B;border-radius:4px;padding:12px 16px">
        <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6">
          Vale verificar se o responsável precisa de apoio ou se o prazo está em risco.
        </p>
      </div>
      ${btn(`${APP_URL}/board`, 'Ver card →')}
    `),
  }
}

/** Lembrete ao responsável de card em Necessita de Ajustes há N horas. */
export function emailLembreteAjustes(opts: {
  destinatarioNome: string
  cardTitulo: string
  clienteNome: string
  horas: number
}): { subject: string; html: string } {
  return {
    subject: `↩ Ajuste pendente há ${opts.horas}h: ${opts.cardTitulo}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        Oi, ${opts.destinatarioNome}!
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O card <strong>"${opts.cardTitulo}"</strong> do cliente <strong>${opts.clienteNome}</strong>
        está aguardando nova versão em <strong>Necessita de ajustes</strong> há mais de ${opts.horas} horas.
      </p>
      <p style="margin:0;font-size:14px;color:#4B5563">
        O cliente já enviou o feedback — só falta a sua revisão! 💪
      </p>
      ${btn(`${APP_URL}/board`, 'Ver feedback e subir versão →')}
    `),
  }
}

// ---------------------------------------------------------------------------
// Onboarding — email enviado ao converter prospect em cliente
// ---------------------------------------------------------------------------

/** Email disparado por actionConverterEmCliente() com link público de onboarding. */
export function emailOnboardingCliente(opts: {
  nome: string
  link: string
}): string {
  return layout(`
    <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
      Olá, ${opts.nome}! 👋
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
      A Simplizzia está pronta para começar a trabalhar com você.
      Antes da nossa primeira reunião, a <strong>Izzi</strong> — a inteligência da Simplizzia —
      vai conduzir um briefing rápido para chegamos preparados.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4B5563;line-height:1.6">
      Leva em média <strong>15 minutos</strong> e garante que o nosso primeiro encontro
      seja direto ao ponto.
    </p>
    ${btn(opts.link, 'Iniciar briefing com a Izzi →')}
    <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;line-height:1.5">
      Se o botão não funcionar, copie e cole este link no navegador:<br/>
      <a href="${opts.link}" style="color:#A046C6">${opts.link}</a>
    </p>
  `)
}

/** Alerta para sócia de plano/contrato de cliente expirando em N dias. */
export function emailContratoExpirando(opts: {
  destinatarioNome: string
  clienteNome: string
  dias: number
  dataRenovacao: string
}): { subject: string; html: string } {
  return {
    subject: `📋 Plano expira em ${opts.dias} dias: ${opts.clienteNome}`,
    html: layout(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1E1E1E">
        Oi, ${opts.destinatarioNome}!
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6">
        O plano de <strong>${opts.clienteNome}</strong> expira em
        <strong>${opts.dias} dias</strong> (${opts.dataRenovacao}).
      </p>
      <div style="background:#EFF6FF;border-left:3px solid #3B82F6;border-radius:4px;padding:12px 16px">
        <p style="margin:0;font-size:14px;color:#1E40AF;line-height:1.6">
          Boa hora para contatar o cliente, confirmar a renovação ou discutir ajustes no plano.
        </p>
      </div>
      ${btn(`${APP_URL}/clientes`, 'Ver cliente →')}
    `),
  }
}
