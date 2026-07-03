/**
 * POST /api/webhooks/whatsapp
 * Webhook de entrada do WhatsApp (Evolution API ou Twilio).
 *
 * Fluxo:
 *   1. Valida autenticação (WHATSAPP_WEBHOOK_SECRET)
 *   2. Extrai número e mensagem
 *   3. Identifica organização pelo número configurado
 *   4. Passa para Izzi (Claude) interpretar e criar card
 *   5. Notifica atendimento via email
 *
 * GET: usado pelo Twilio/Evolution API para verificar o webhook (handshake).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buscarEmailsEquipe, enviarEmail } from '@/lib/email'

export const maxDuration = 60

// ---------------------------------------------------------------------------
// GET — Verificação do webhook (handshake do Twilio / Evolution API)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  // Twilio: não usa; Evolution API: retorna 200
  // WhatsApp Business API (Meta): verifica hub.challenge
  const challenge = searchParams.get('hub.challenge')
  const token     = searchParams.get('hub.verify_token')

  if (token === process.env.WHATSAPP_WEBHOOK_SECRET && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ ok: true })
}

// ---------------------------------------------------------------------------
// POST — Mensagem recebida
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET
  const authHeader = req.headers.get('x-webhook-secret') ??
                     req.headers.get('x-evolution-signature') ?? ''

  // Valida o secret (apenas se configurado)
  if (secret && authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Normaliza payload do Evolution API e Twilio
  const payload = normalizePayload(body)
  if (!payload) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const { mensagemId, numero, nomeRemetente, texto, tipoMensagem } = payload

  const service = createServiceClient()

  // Identifica a organização pelo número do WhatsApp configurado
  const numeroBot = process.env.WHATSAPP_PHONE_NUMBER ?? ''
  const { data: orgRow } = await service
    .from('organizacoes')
    .select('id, nome')
    .limit(1)
    .single()

  if (!orgRow) {
    return NextResponse.json({ error: 'Organização não configurada' }, { status: 500 })
  }

  const orgId = orgRow.id as string

  // Idempotência — evita processar duas vezes a mesma mensagem
  if (mensagemId) {
    const { data: existente } = await service
      .from('whatsapp_mensagens')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('mensagem_id', mensagemId)
      .single()

    if (existente) {
      return NextResponse.json({ ok: true, idempotent: true })
    }
  }

  // Salva a mensagem recebida
  const { data: msgRow, error: msgErr } = await service
    .from('whatsapp_mensagens')
    .insert({
      organization_id:  orgId,
      numero_remetente: numero,
      nome_remetente:   nomeRemetente,
      mensagem_id:      mensagemId,
      tipo_mensagem:    tipoMensagem,
      conteudo_texto:   texto,
      status:           'processando',
      recebido_em:      new Date().toISOString(),
    })
    .select('id')
    .single()

  if (msgErr || !msgRow) {
    return NextResponse.json({ error: 'Erro ao salvar mensagem' }, { status: 500 })
  }

  const waMsgId = msgRow.id as string

  // Processa com Izzi (Claude)
  try {
    const resultado = await processarComIzzi(texto ?? '(sem texto)', numero, nomeRemetente, orgId)

    if (resultado.cardCriado && resultado.cardId) {
      // Atualiza a mensagem com o card criado
      await service.from('whatsapp_mensagens').update({
        card_id:       resultado.cardId,
        status:        'card_criado',
        processado_em: new Date().toISOString(),
      }).eq('id', waMsgId)

      // Notifica atendimento por email
      const emails = await buscarEmailsEquipe(orgId, ['socia', 'atendimento'])
      if (emails.length) {
        await enviarEmail(
          emails,
          `Novo pedido via WhatsApp de ${nomeRemetente ?? numero}`,
          emailWhatsAppCard({
            nomeRemetente: nomeRemetente ?? numero,
            numero,
            resumo: resultado.resumo ?? texto ?? '',
            cardId: resultado.cardId,
          }),
        )
      }
    } else {
      await service.from('whatsapp_mensagens').update({
        status:        'ignorado',
        processado_em: new Date().toISOString(),
      }).eq('id', waMsgId)
    }
  } catch (err) {
    console.error('[whatsapp/webhook] erro Izzi:', err)
    await service.from('whatsapp_mensagens').update({
      status:         'erro',
      erro_detalhes:  String(err),
      processado_em:  new Date().toISOString(),
    }).eq('id', waMsgId)
  }

  // Responde imediatamente — processamento foi feito sync mas não bloqueia o webhook
  return NextResponse.json({ ok: true, numeroBot })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NormalizedPayload {
  mensagemId: string | null
  numero: string
  nomeRemetente: string | null
  texto: string | null
  tipoMensagem: string
}

function normalizePayload(body: Record<string, unknown>): NormalizedPayload | null {
  // Evolution API v2
  if (body.event === 'messages.upsert' || body.type === 'messages.upsert') {
    const data = body.data as Record<string, unknown> | undefined
    const msg = data?.message as Record<string, unknown> | undefined
    if (!msg) return null

    const numero = (msg.remoteJid as string)?.replace('@s.whatsapp.net', '') ?? ''
    const texto = (msg.conversation as string) ??
      ((msg.extendedTextMessage as Record<string, unknown>)?.text as string) ?? null
    const tipo = msg.imageMessage ? 'image'
      : msg.audioMessage ? 'audio'
      : msg.documentMessage ? 'document'
      : 'text'

    return {
      mensagemId:    msg.id as string | null,
      numero,
      nomeRemetente: (data?.pushName as string) ?? null,
      texto,
      tipoMensagem:  tipo,
    }
  }

  // Twilio
  if (body.SmsMessageSid || body.MessageSid) {
    return {
      mensagemId:    (body.MessageSid ?? body.SmsMessageSid) as string,
      numero:        (body.From as string)?.replace('whatsapp:', '') ?? '',
      nomeRemetente: null,
      texto:         body.Body as string | null,
      tipoMensagem:  'text',
    }
  }

  // Meta WhatsApp Business API
  const entry = (body.entry as unknown[])?.[0] as Record<string, unknown> | undefined
  const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined
  const value = changes?.value as Record<string, unknown> | undefined
  const messages = value?.messages as unknown[]
  const firstMsg = messages?.[0] as Record<string, unknown> | undefined

  if (firstMsg) {
    const contacts = value?.contacts as unknown[]
    const contact = (contacts?.[0] as Record<string, unknown>) ?? {}
    const profile = contact.profile as Record<string, unknown> | undefined
    return {
      mensagemId:    firstMsg.id as string | null,
      numero:        firstMsg.from as string ?? '',
      nomeRemetente: profile?.name as string | null,
      texto:         (firstMsg.text as Record<string, string>)?.body ?? null,
      tipoMensagem:  firstMsg.type as string ?? 'text',
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// processarComIzzi — interpreta a mensagem e cria o card
// ---------------------------------------------------------------------------

async function processarComIzzi(
  texto: string,
  numero: string,
  nomeRemetente: string | null,
  orgId: string,
): Promise<{ cardCriado: boolean; cardId?: string; resumo?: string }> {
  const service = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Busca tipos de demanda da organização
  const { data: tipos } = await service
    .from('tipos_demanda')
    .select('id, nome, descricao')
    .eq('organization_id', orgId)
    .eq('ativo', true)
    .order('nome')
    .limit(20)

  const tiposTexto = (tipos ?? [])
    .map((t) => `- ${(t as { nome: string; descricao?: string | null }).nome}: ${(t as { nome: string; descricao?: string | null }).descricao ?? ''}`)
    .join('\n')

  // Busca clientes ativos para tentar identificar
  const { data: clientes } = await service
    .from('clientes')
    .select('id, nome')
    .eq('organization_id', orgId)
    .eq('status', 'ativo')
    .order('nome')
    .limit(50)

  const clientesTexto = (clientes ?? [])
    .map((c) => `- ${(c as { id: string; nome: string }).nome} (id: ${(c as { id: string; nome: string }).id})`)
    .join('\n')

  const prompt = `Você é Izzi, assistente da Simplizzia. Uma mensagem chegou pelo WhatsApp.

**Remetente:** ${nomeRemetente ?? 'Desconhecido'} (${numero})
**Mensagem:** ${texto}

**Tipos de demanda disponíveis:**
${tiposTexto || '(nenhum cadastrado)'}

**Clientes ativos:**
${clientesTexto || '(nenhum)'}

Analise a mensagem e responda em JSON com este formato:
{
  "criar_card": true/false,
  "tipo_demanda_nome": "nome do tipo mais adequado ou null",
  "cliente_id": "UUID do cliente identificado ou null",
  "titulo": "título resumido da demanda ou null",
  "resumo": "resumo de 1-2 frases do que foi pedido",
  "observacoes": "detalhes extras para o card"
}

Se a mensagem não for um pedido de serviço (ex.: agradecimento, pergunta genérica), responda com criar_card: false.`

  const response = await anthropic.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 500,
    messages:   [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: {
    criar_card: boolean
    tipo_demanda_nome: string | null
    cliente_id: string | null
    titulo: string | null
    resumo: string
    observacoes: string
  }

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
  } catch {
    return { cardCriado: false, resumo: rawText }
  }

  if (!parsed.criar_card || !parsed.titulo) {
    return { cardCriado: false, resumo: parsed.resumo }
  }

  // Busca o tipo de demanda pelo nome
  const tipoEncontrado = (tipos ?? []).find(
    (t) => (t as { nome: string }).nome === parsed.tipo_demanda_nome
  )

  // Busca o responsável padrão (atendimento)
  const { data: atendimento } = await service
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)
    .eq('papel', 'atendimento')
    .eq('ativo', true)
    .limit(1)
    .single()

  // Cria o card
  const { data: card, error: cardErr } = await service
    .from('cards')
    .insert({
      organization_id: orgId,
      titulo:          parsed.titulo,
      tipo_id:         (tipoEncontrado as { id: string } | null)?.id ?? null,
      cliente_id:      parsed.cliente_id ?? null,
      status:          'a_fazer',
      prioridade:      'normal',
      responsavel_id:  (atendimento as { id: string } | null)?.id ?? null,
      campos_publicos: {} as import('@/types/database').Json,
    })
    .select('id')
    .single()

  if (cardErr || !card) {
    throw new Error(`Erro ao criar card: ${cardErr?.message}`)
  }

  // Campos internos vivem em tabela isolada (RLS nega acesso direto via API)
  await (service.from('cards_internos' as never) as unknown as { insert: (v: unknown) => Promise<unknown> })
    .insert({
      card_id: card.id,
      organization_id: orgId,
      dados: {
        origem:    'whatsapp',
        numero:    numero,
        remetente: nomeRemetente,
        mensagem_original: texto,
        observacoes_izzi: parsed.observacoes,
      },
    })

  return {
    cardCriado: true,
    cardId:     card.id as string,
    resumo:     parsed.resumo,
  }
}

// ---------------------------------------------------------------------------
// Template de email para atendimento
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function emailWhatsAppCard(opts: {
  nomeRemetente: string
  numero: string
  resumo: string
  cardId: string
}): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
      <tr>
        <td style="background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);padding:20px 28px">
          <p style="margin:0;font-size:16px;font-weight:700;color:#fff">📱 Novo pedido via WhatsApp</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px">
          <p style="margin:0 0 8px;font-size:13px;color:#6B7280">De</p>
          <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#1E1E1E">
            ${opts.nomeRemetente} · ${opts.numero}
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#6B7280">Resumo interpretado por Izzi</p>
          <div style="background:#F9FAFB;border-radius:10px;padding:14px;font-size:14px;color:#374151;line-height:1.6">
            ${opts.resumo}
          </div>
          <div style="margin-top:24px;text-align:center">
            <a href="${APP_URL}/board?card=${opts.cardId}" style="display:inline-block;background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:12px">
              Ver card criado →
            </a>
          </div>
          <p style="margin:20px 0 0;font-size:11px;color:#9CA3AF;text-align:center">
            Izzi · Simplizzia
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table></body></html>`
}
