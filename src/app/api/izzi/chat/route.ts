/**
 * POST /api/izzi/chat
 *
 * Corpo: { mensagem: string, conversaId?: string | null, clienteId?: string | null }
 * Resposta: { resposta: string, conversaId: string }
 *
 * - Autenticação via Supabase Auth
 * - Contexto adaptado por papel (cliente vs equipe)
 * - Histórico dos últimos MAX_HISTORICO turnos incluído
 * - Persiste conversa + mensagens no banco
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  buildContextoParaCliente,
  buildContextoParaEquipe,
  systemPromptCliente,
  systemPromptEquipe,
} from '@/lib/izzi/prompts'

const MAX_HISTORICO = 12 // últimas 12 mensagens (6 turnos)

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, papel, nome')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 401 })
    }

    // 3. Parse body
    const body = (await req.json()) as {
      mensagem?: string
      conversaId?: string | null
      clienteId?: string | null
    }

    const { mensagem, conversaId: bodyConversaId, clienteId } = body

    if (!mensagem?.trim()) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })
    }

    const service = createServiceClient()
    const organizationId = profile.organization_id as string
    const ehCliente = profile.papel === 'cliente'

    // 4. Encontra ou cria conversa
    let conversaId = bodyConversaId ?? null

    if (!conversaId) {
      const { data: novaConversa, error: errConversa } = await service
        .from('izzi_conversas')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          contexto_tipo: ehCliente ? 'cliente' : 'equipe',
          cliente_id: clienteId ?? null,
          ativa: true,
        })
        .select('id')
        .single()

      if (errConversa || !novaConversa) {
        return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 })
      }

      conversaId = novaConversa.id as string
    } else {
      // Valida que a conversa pertence ao usuário
      const { data: conversa } = await service
        .from('izzi_conversas')
        .select('id, user_id')
        .eq('id', conversaId)
        .eq('organization_id', organizationId)
        .single()

      if (!conversa || (conversa.user_id as string) !== user.id) {
        return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
      }
    }

    // 5. Histórico da conversa
    const { data: historico } = await service
      .from('izzi_mensagens')
      .select('role, conteudo')
      .eq('conversa_id', conversaId)
      .eq('organization_id', organizationId)
      .order('criado_em', { ascending: true })
      .limit(MAX_HISTORICO)

    // 6. Contexto adaptado por papel
    let contexto = ''
    if (ehCliente) {
      contexto = await buildContextoParaCliente(user.id, organizationId)
    } else {
      // equipe: usa clienteId fornecido ou overview geral
      contexto = await buildContextoParaEquipe(organizationId, clienteId ?? undefined)
    }

    const systemPrompt = ehCliente
      ? systemPromptCliente(contexto)
      : systemPromptEquipe(contexto)

    // 7. Monta mensagens para o Claude
    const messages: Anthropic.MessageParam[] = [
      ...(historico ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.conteudo as string,
      })),
      { role: 'user', content: mensagem.trim() },
    ]

    // 8. Chama Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const resposta = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('\n')

    const tokensInput = response.usage.input_tokens
    const tokensOutput = response.usage.output_tokens

    // 9. Persiste user + assistant messages
    await service.from('izzi_mensagens').insert([
      {
        conversa_id: conversaId,
        organization_id: organizationId,
        role: 'user',
        conteudo: mensagem.trim(),
      },
      {
        conversa_id: conversaId,
        organization_id: organizationId,
        role: 'assistant',
        conteudo: resposta,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
      },
    ])

    // 10. Atualiza timestamp da conversa
    await service
      .from('izzi_conversas')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)

    return NextResponse.json({ resposta, conversaId })
  } catch (err) {
    console.error('[Izzi Chat] Erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
