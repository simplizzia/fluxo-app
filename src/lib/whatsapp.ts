/**
 * WhatsApp Outbound — Sprint 5.6
 *
 * Envia mensagens via Evolution API ou Twilio (provider configurado em env).
 * Uso interno: notificar clientes quando card vai para para_aprovacao.
 *
 * Variáveis de ambiente:
 *   WHATSAPP_PROVIDER           — evolution | twilio
 *   WHATSAPP_API_URL            — base URL da Evolution API (ex: https://evo.empresa.com)
 *   WHATSAPP_API_TOKEN          — apikey do Evolution / Twilio Auth Token
 *   WHATSAPP_PHONE_NUMBER_ID    — nome da instância (Evolution) ou número E.164 (Twilio)
 *   TWILIO_ACCOUNT_SID          — apenas Twilio
 */
import 'server-only'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Enviar texto genérico
// ---------------------------------------------------------------------------

export async function enviarMensagemWhatsApp(
  numero: string,  // E.164: "+5511999999999"
  mensagem: string,
): Promise<{ ok: boolean; error?: string }> {
  const provider = process.env.WHATSAPP_PROVIDER ?? 'evolution'

  try {
    if (provider === 'evolution') {
      return await _enviarEvolution(numero, mensagem)
    }
    if (provider === 'twilio') {
      return await _enviarTwilio(numero, mensagem)
    }
    return { ok: false, error: `Provider "${provider}" não suportado.` }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Notificação: card enviado para aprovação
// ---------------------------------------------------------------------------

export async function notificarClienteParaAprovacao(opts: {
  clienteTelefone: string | null
  cardTitulo: string
  tipoNome: string
  cardId: string
}): Promise<void> {
  const { clienteTelefone, cardTitulo, tipoNome, cardId } = opts

  if (!clienteTelefone) return
  if (!process.env.WHATSAPP_PROVIDER) return  // WhatsApp não configurado

  const link = `${APP_URL}/aprovacao/${cardId}`
  const msg =
    `✅ *${tipoNome || 'Sua demanda'} está pronto para aprovação!*\n\n` +
    `📋 *${cardTitulo}*\n\n` +
    `Acesse o link abaixo para visualizar a entrega e registrar sua aprovação:\n${link}`

  await enviarMensagemWhatsApp(clienteTelefone, msg).catch(() => {
    // best-effort — não bloqueia o fluxo principal
  })
}

// ---------------------------------------------------------------------------
// Evolution API
// ---------------------------------------------------------------------------

async function _enviarEvolution(
  numero: string,
  mensagem: string,
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl  = process.env.WHATSAPP_API_URL
  const apiKey   = process.env.WHATSAPP_API_TOKEN
  const instance = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!baseUrl || !apiKey || !instance) {
    return { ok: false, error: 'Evolution API não configurada (faltam WHATSAPP_API_URL, WHATSAPP_API_TOKEN ou WHATSAPP_PHONE_NUMBER_ID).' }
  }

  // Normaliza número: Evolution aceita sem "+" e com @s.whatsapp.net ou só números
  const numeroLimpo = numero.replace(/\D/g, '')

  const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    body: JSON.stringify({
      number: numeroLimpo,
      text:   mensagem,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, error: `Evolution API ${res.status}: ${body}` }
  }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------

async function _enviarTwilio(
  numero: string,
  mensagem: string,
): Promise<{ ok: boolean; error?: string }> {
  const sid     = process.env.TWILIO_ACCOUNT_SID
  const token   = process.env.WHATSAPP_API_TOKEN
  const fromNum = process.env.WHATSAPP_PHONE_NUMBER_ID  // E.164 do número Twilio

  if (!sid || !token || !fromNum) {
    return { ok: false, error: 'Twilio não configurado (faltam TWILIO_ACCOUNT_SID, WHATSAPP_API_TOKEN ou WHATSAPP_PHONE_NUMBER_ID).' }
  }

  const credentials = Buffer.from(`${sid}:${token}`).toString('base64')
  const params = new URLSearchParams({
    From: `whatsapp:${fromNum}`,
    To:   `whatsapp:${numero}`,
    Body: mensagem,
  })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, error: `Twilio ${res.status}: ${body}` }
  }

  return { ok: true }
}
