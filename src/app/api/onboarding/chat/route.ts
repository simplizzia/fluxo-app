/**
 * POST /api/onboarding/chat
 * Streaming SSE do chat de onboarding com a Izzi.
 *
 * Suporta duas fases:
 *   - boas-vindas: Izzi apresenta a Simplizzia e explica o processo (máx 3 trocas)
 *   - briefing: Izzi conduz o briefing Modo 1 de uma marca específica
 *
 * Marcadores detectados pelo cliente (não pelo servidor):
 *   [BOAS_VINDAS_CONCLUIDA] → cliente inicia fase briefing da 1ª marca
 *   [MARCA_CONCLUIDA]       → cliente salva briefing e avança para próxima
 *   [ONBOARDING_COMPLETO]   → cliente chama /api/onboarding/complete
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Cache simples em memória para evitar buscar o banco a cada mensagem
const sessionCache = new Map<string, { data: SessionData; ts: number }>()
const CACHE_TTL = 60_000

interface SessionData {
  organization_id: string
  cliente: ClienteData
}

interface MarcaData {
  id: string
  nome: string
  publico: string | null
  posicionamentoAtual: string | null
  concorrentes: string | null
  contextoEstrategico: string | null
  cenarioAtual: string | null
}

interface ClienteData {
  nome: string
  nomeContato: string | null
  setor: string | null
  servicosContratados: string[]
  objetivoDeclarado: string | null
  doresIdentificadas: string | null
  cenarioAtual: string | null
  contextExtra: string | null
  marcas: MarcaData[]
}

async function buscarSessao(token: string): Promise<SessionData | null> {
  const hit = sessionCache.get(token)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data

  const service = createServiceClient()

  const { data: session } = await service
    .from('onboarding_clientes')
    .select(`
      organization_id, client_name, nome_contato, setor,
      servicos_contratados, objetivo_declarado, dores_identificadas, cenario_atual, context_extra
    `)
    .eq('token', token)
    .single()

  if (!session) return null

  const { data: marcas } = await service
    .from('onboarding_marcas')
    .select('id, nome, publico, posicionamento_atual, concorrentes, contexto_estrategico, cenario_atual')
    .eq('token', token)
    .order('ordem', { ascending: true })

  const data: SessionData = {
    organization_id: session.organization_id as string,
    cliente: {
      nome:                session.client_name,
      nomeContato:         session.nome_contato,
      setor:               session.setor,
      servicosContratados: (session.servicos_contratados as string[]) ?? [],
      objetivoDeclarado:   session.objetivo_declarado,
      doresIdentificadas:  session.dores_identificadas,
      cenarioAtual:        session.cenario_atual,
      contextExtra:        session.context_extra,
      marcas: (marcas ?? []).map((m) => ({
        id:                   m.id,
        nome:                 m.nome,
        publico:              m.publico,
        posicionamentoAtual:  m.posicionamento_atual,
        concorrentes:         m.concorrentes,
        contextoEstrategico:  m.contexto_estrategico,
        cenarioAtual:         m.cenario_atual,
      })),
    },
  }

  sessionCache.set(token, { data, ts: Date.now() })
  return data
}

// ─── System prompts ───────────────────────────────────────────────────────────

function buildBoasVindasPrompt(s: SessionData): string {
  const { cliente } = s
  const servicos = cliente.servicosContratados.length
    ? cliente.servicosContratados.join(', ')
    : 'não informado'

  return `Você é a Izzi, a IA da Simplizzia. Tom: bem-humorado, caloroso, direto. Nunca corporativo.

SOBRE A SIMPLIZZIA:
Empresa de estratégia e criatividade que integra inteligência, tecnologia e execução para negócios que recusam o lugar-comum. Três hubs: Estratégia (diagnóstico e consultoria), Studio (social media, design e conteúdo) e Tech (automação e processos).

CONTEXTO DO CLIENTE:
- Empresa: ${cliente.nome}
- Setor: ${cliente.setor ?? 'não informado'}
- Serviços contratados: ${servicos}
- Objetivo: ${cliente.objetivoDeclarado ?? 'não informado'}
- Cenário atual: ${cliente.cenarioAtual ?? 'não informado'}
- Contato: ${cliente.nomeContato ?? 'não informado'}
${cliente.contextExtra ? `\nNOTAS INTERNAS DA EQUIPE (use para calibrar abordagem, não mencione ao cliente):\n${cliente.contextExtra}\n` : ''}
SUA MISSÃO:
Apresentar a Simplizzia de forma genuína e contextualizada para esse cliente. Mostre que você já conhece o contexto. Explique que o próximo passo é o briefing de marca — você vai conversar sobre cada marca separadamente (${cliente.marcas.length} marca${cliente.marcas.length !== 1 ? 's' : ''} no total).

REGRAS:
- Fale diretamente com ${cliente.nomeContato ?? 'o cliente'} pelo primeiro nome
- Seja breve — no máximo 3 trocas antes de partir para o briefing
- Quando estiver pronto para ir ao briefing, finalize com exatamente: [BOAS_VINDAS_CONCLUIDA]
- Não use o marcador sem ter feito ao menos uma troca`
}

function buildBriefingPrompt(s: SessionData, marcaId: string): string {
  const { cliente } = s
  const marca = cliente.marcas.find((m) => m.id === marcaId)
  if (!marca) return ''

  const marcaIndex = cliente.marcas.findIndex((m) => m.id === marcaId)
  const totalMarcas = cliente.marcas.length
  const isUltima = marcaIndex === totalMarcas - 1

  const partes: string[] = []
  if (marca.contextoEstrategico) partes.push(`CONTEXTO ESTRATÉGICO:\n${marca.contextoEstrategico}`)
  if (marca.posicionamentoAtual) partes.push(`POSICIONAMENTO ATUAL:\n${marca.posicionamentoAtual}`)
  if (marca.concorrentes)        partes.push(`CONCORRENTES:\n${marca.concorrentes}`)
  if (marca.cenarioAtual)        partes.push(`CENÁRIO ATUAL:\n${marca.cenarioAtual}`)

  const contexto = partes.length ? partes.join('\n\n') + '\n\n' : ''

  return `Você é a Izzi, conduzindo o briefing da marca "${marca.nome}"${marca.publico ? ` (${marca.publico})` : ''} da empresa ${cliente.nome}.

${contexto}MISSÃO:
Conduzir o Modo 1 do briefing — entender profundamente essa marca via conversa. Explore:
- Tom de voz e personalidade da marca
- O que a marca representa e promete ao cliente
- O que nunca deve aparecer na comunicação
- Referências visuais ou marcas que inspiram${marca.contextoEstrategico ? '\n- Cubra também os tópicos mencionados no CONTEXTO ESTRATÉGICO acima que ainda não estão respondidos — especialmente objetivos por serviço (redes sociais, tráfego, SEO, influenciadores)' : ''}

REGRAS:
- Você já está no meio da sessão de onboarding — não se apresente de novo, vá direto para esta marca
- Uma pergunta por vez
- Quando você já tem informação sobre algo, valide em vez de perguntar do zero
- Aprofunde respostas curtas antes de avançar
- ${isUltima ? 'Esta é a última marca.' : `Esta é a marca ${marcaIndex + 1} de ${totalMarcas}.`}

PARA ENCERRAR ESTA MARCA:
Quando tiver coletado tudo, produza o OUTPUT MODO 1 — briefing estruturado com:

**Tom de voz e personalidade**
[síntese]

**O que a marca representa e promete**
[síntese]

**O que nunca deve aparecer**
[síntese]

**Referências e inspirações**
[síntese]
${marca.contextoEstrategico ? '\n**Objetivos e estratégia de canais**\n[síntese dos objetivos por serviço discutidos: redes sociais, tráfego, SEO, influenciadores e outros temas levantados no contexto]' : ''}
Escreva o documento completo e, na linha imediatamente seguinte (sem mais nenhum texto depois), escreva exatamente:${isUltima ? '\n[ONBOARDING_COMPLETO]' : '\n[MARCA_CONCLUIDA]'}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    token: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    fase: 'boas-vindas' | 'briefing'
    marcaId?: string
    init?: boolean
  }

  const { token, messages, fase, marcaId, init } = body

  if (!token || !fase) {
    return Response.json({ error: 'token e fase obrigatórios' }, { status: 400 })
  }

  const session = await buscarSessao(token)
  if (!session) return Response.json({ error: 'Token inválido' }, { status: 401 })

  let systemPrompt: string
  if (fase === 'boas-vindas') {
    systemPrompt = buildBoasVindasPrompt(session)
  } else if (fase === 'briefing' && marcaId) {
    systemPrompt = buildBriefingPrompt(session, marcaId)
    if (!systemPrompt) return Response.json({ error: 'Marca não encontrada' }, { status: 404 })
  } else {
    return Response.json({ error: 'fase ou marcaId inválido' }, { status: 400 })
  }

  // Mensagens a enviar (filtra mensagens internas de trigger)
  const mensagensFiltradas = (messages ?? []).filter(
    (m) => !String(m.content).startsWith('__')
  )
  const mensagensParaEnviar = (init || mensagensFiltradas.length === 0)
    ? [{ role: 'user' as const, content: 'Olá' }]
    : mensagensFiltradas

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let acumulado = ''
      try {
        const stream = anthropic.messages.stream({
          model:      'claude-opus-4-5',
          max_tokens: 4096,
          system:     systemPrompt,
          messages:   mensagensParaEnviar,
        })

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            acumulado += event.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))

        // Salva transcrição server-side como backup (fire-and-forget)
        if (marcaId && acumulado) {
          const service = createServiceClient()
          const todasMensagens = [
            ...mensagensParaEnviar,
            { role: 'assistant' as const, content: acumulado },
          ]
          const transcricao = todasMensagens
            .filter((m) => !String(m.content).startsWith('__'))
            .map((m) => `${m.role === 'user' ? 'Cliente' : 'Izzi'}: ${m.content}`)
            .join('\n\n---\n\n')

          void service.from('onboarding_mensagens').insert({
            organization_id: session.organization_id,
            token,
            role:    'assistant',
            content: transcricao,
          })
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
