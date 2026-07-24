/**
 * Gera o copy dos posts pendentes do calendário editorial de julho/2026 do
 * Bantu-Katu, usando os agentes do catálogo do app (criativo.carrossel,
 * criativo.post-foto-real), replicando a lógica de executarAgente()
 * (src/lib/agents/executor.ts) — mesmo contexto de marca (universo_marca,
 * sem marcaId, igual ao disparo manual via /agentes), mesma gravação em
 * agent_runs. Não passa por card (Pattern C — manual).
 *
 * Uso: node scripts/gerar-posts-bantukatu.mjs
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const env = {}
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  } catch {}
  return env
}

const env = { ...loadEnv(), ...process.env }
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'
const CLIENTE_ID = 'c0e59f11-6ff0-4c02-b08c-1c5b5459ba6e'

// --- buildContextoCliente (replica src/lib/agents/executor.ts, sem marcaId) ---
async function buildContextoCliente(clienteId, organizationId) {
  const { data: cliente } = await supabase
    .from('clientes')
    .select('nome, status')
    .eq('id', clienteId)
    .eq('organization_id', organizationId)
    .single()
  if (!cliente) return ''

  const partes = [`## Dados do Cliente\nNome: ${cliente.nome}\nStatus: ${cliente.status}`]

  const { data: secoes } = await supabase
    .from('universo_marca')
    .select('categoria, titulo, conteudo, marca_id')
    .eq('cliente_id', clienteId)
    .eq('organization_id', organizationId)
    .order('categoria')

  if (secoes && secoes.length > 0) {
    partes.push('\n## Universo de Marca')
    for (const s of secoes) {
      const texto = s.conteudo?.texto ?? ''
      if (texto) partes.push(`\n### ${s.titulo}\n${texto}`)
    }
  }
  return partes.join('\n')
}

async function buildFeedbackContext(agentId, organizationId, clienteId) {
  let query = supabase
    .from('agent_feedback')
    .select('avaliacao, comentario, criado_em')
    .eq('organization_id', organizationId)
    .eq('agent_id', agentId)
    .order('criado_em', { ascending: false })
    .limit(5)
  if (clienteId) query = query.eq('cliente_id', clienteId)
  const { data: feedbacks } = await query
  if (!feedbacks || feedbacks.length === 0) return ''
  const linhas = feedbacks.map((f) => {
    const icone = f.avaliacao === 'bom' ? '✅' : '❌'
    const comentario = f.comentario ? ` — "${f.comentario}"` : ''
    return `${icone}${comentario}`
  })
  return (
    '\n\n## Histórico de Feedback (calibre seu output com base nisto)' +
    '\nAs últimas avaliações deste agente para este cliente foram:\n' +
    linhas.join('\n') +
    '\nUse estes feedbacks para ajustar o estilo, tom e estrutura do output atual.'
  )
}

async function executarAgente({ agenteChave, input, maxTokens = 4096 }) {
  const { data: agente, error: errAgente } = await supabase
    .from('agent_catalog')
    .select('id, nome, prompt_sistema')
    .eq('chave', agenteChave)
    .eq('ativo', true)
    .single()
  if (errAgente || !agente) return { error: `Agente "${agenteChave}" não encontrado.` }

  const { data: run } = await supabase
    .from('agent_runs')
    .insert({
      organization_id: ORGANIZATION_ID,
      agent_id: agente.id,
      cliente_id: CLIENTE_ID,
      status: 'rodando',
      input,
    })
    .select('id')
    .single()

  const runId = run?.id
  const inicio = Date.now()

  try {
    const [contextoCliente, contextoFeedback] = await Promise.all([
      buildContextoCliente(CLIENTE_ID, ORGANIZATION_ID),
      buildFeedbackContext(agente.id, ORGANIZATION_ID, CLIENTE_ID),
    ])

    const inputTexts = Object.entries(input)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `**${k}:** ${v}`)
      .join('\n')

    const contextoParts = [contextoCliente, contextoFeedback].filter(Boolean).join('')
    const userMessage = contextoParts
      ? `${contextoParts}\n\n## Input do Usuário\n${inputTexts}`
      : inputTexts || 'Inicie com base no contexto do cliente disponível.'

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system: agente.prompt_sistema,
      messages: [{ role: 'user', content: userMessage }],
    })

    const outputText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    await supabase
      .from('agent_runs')
      .update({
        status: 'concluido',
        output: { texto: outputText },
        tokens_input: response.usage.input_tokens,
        tokens_output: response.usage.output_tokens,
        duracao_ms: Date.now() - inicio,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', runId)

    return { runId, output: outputText }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido'
    await supabase
      .from('agent_runs')
      .update({ status: 'falhou', erro: mensagem, duracao_ms: Date.now() - inicio, atualizado_em: new Date().toISOString() })
      .eq('id', runId)
    return { runId, error: mensagem }
  }
}

// --- Definição dos 9 posts pendentes de copy (calendário julho/2026) ---

const CTA_CULTURA_VIVA = "CTA padrão do pilar Cultura viva: 'Salva pra não perder' / 'Compartilha com quem ama cultura popular'."
const CTA_MOVIMENTO = "CTA padrão do pilar Movimento em ação: 'A agenda fica nos destaques.'"

const POSTS = [
  {
    data: '15/07',
    agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel educativo 'Do terreiro pro tambor': como o Bantu-Katu adapta instrumentos tradicionais do Bumba Meu Boi (matraca, pandeirão) para os instrumentos do movimento (tumbadora, tamborim, efeitos). " +
        'Ângulo: o que o Bantu-Katu faz de concreto — fato observável, não exige validar procedência regional. ' +
        'Estrutura: título forte → instrumento tradicional (matraca ou pandeirão) → instrumento do movimento que assume o papel → o que muda no som. ' +
        CTA_CULTURA_VIVA,
      num_slides: 5,
    },
  },
  {
    data: '17/07',
    agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel leve/enquete do pilar 'Bora junto': 'Adivinha o som' — recorte de 3-5s de áudio de um instrumento do ciclo do Bumba Meu Boi tocando sozinho → pergunta 'de onde vem esse som?' → resposta revelada no dia seguinte nos Stories. " +
        'Objetivo: engajamento ativo — gerar comentário, resposta e participação, não só alcance passivo. Gatilho: curiosidade e vontade de entrar na conversa. ' +
        "CTA: pergunta direta que convide resposta ('Responde aí', 'Vota nos Stories').",
      num_slides: 3,
    },
  },
  {
    data: '22/07',
    agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel do pilar 'As frentes': apresentar o ciclo do Bumba Meu Boi do Tambores do Bantu-Katu como ele é agora — já rolando desde junho, vai até agosto, e alguém pode entrar mesmo no meio. " +
        'Deixar claro que é um ciclo do Tambores do Bantu-Katu (grupo de apresentação), não uma frente separada — não confundir com "aulas de percussão" (ainda não ativa). ' +
        "Estrutura: o que é → como funciona → pra quem é → quando acontece. CTA: 'Dúvidas? Chama na DM.'",
      num_slides: 5,
    },
  },
  {
    data: '24/07',
    agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel + áudio — estreia da série 'Sonoridades Bantu-Katu': apresenta o TAMBOR como instrumento do movimento — o que é, como soa, que ritmo/papel ele cumpre no ciclo do Bumba Meu Boi atual. " +
        "É o espelho do post de 15/07 (que fala da transformação/adaptação); este aprofunda um instrumento específico. " +
        'Estrutura: título → close no tambor + o som que ele faz (áudio real de registro) → o ritmo/papel que ele cumpre no ciclo atual. ' +
        CTA_CULTURA_VIVA,
      num_slides: 4,
    },
  },
  {
    data: '29/07',
    agenteChave: 'criativo.carrossel',
    input: {
      tema:
        'Carrossel educativo sobre a origem do Bumba Meu Boi — tradição confirmada como a do ciclo atual do Tambores do Bantu-Katu. ' +
        'Estrutura: título forte → o que é o Bumba Meu Boi em linhas gerais (tradição popular ligada às festas juninas, raízes afro-indígenas-portuguesas, mais conhecida no Maranhão mas presente em festejos por todo o Brasil) → conexão com o que o Bantu-Katu está fazendo com esse repertório agora. ' +
        'CUIDADO OBRIGATÓRIO: NÃO afirmar um sotaque/variante regional específico (ex: Boi de Zabumba, Boi de Matraca, Boi de Orquestra) — ficar no nível geral da tradição, sem inventar detalhe de procedência não confirmado. ' +
        CTA_CULTURA_VIVA,
      num_slides: 5,
    },
  },
  {
    data: '06/07',
    agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        'Vídeo/foto de registro do encontro de sábado (04/07/2026), vivência do ciclo do Bumba Meu Boi do Tambores do Bantu-Katu. Material real ainda não capturado — a direção de captura deve seguir o checklist de 4 planos: (1) fechado em mãos/instrumento, (2) reação genuína, (3) momento de dificuldade real, (4) plano geral por último; priorizar a virada matraca/pandeirão → tambor/tumbadora quando existir no material daquele dia. NÃO assumir que o material já existe, tem áudio original ou que o público já conhece o "ciclo do Bumba Meu Boi" publicamente.',
      objetivo:
        "Consciência + prova social ('isso existe, acontece com frequência, é real'), gatilho de pertencimento ('eu queria estar aí'). Estrutura de copy: abertura no clima ('Foi assim no último encontro.') + 2-3 linhas de contexto específico + fecho de convite direto, sem pressão. " +
        CTA_MOVIMENTO,
    },
  },
  {
    data: '13/07',
    agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        'Vídeo/foto de registro do encontro de sábado (11/07/2026), vivência do ciclo do Bumba Meu Boi do Tambores do Bantu-Katu. Material real ainda não capturado — mesmo checklist de 4 planos do post de 06/07. NÃO assumir que o material já existe ou tem áudio original.',
      objetivo:
        "Consciência + prova social, gatilho de pertencimento. Estrutura de copy: abertura no clima ('Foi assim no último encontro.') + 2-3 linhas de contexto específico + fecho de convite direto, sem pressão. " +
        CTA_MOVIMENTO,
    },
  },
  {
    data: '20/07',
    agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        'Vídeo/foto de registro do encontro de sábado (18/07/2026), vivência do ciclo do Bumba Meu Boi do Tambores do Bantu-Katu. Material real ainda não capturado — mesmo checklist de 4 planos do post de 06/07. NÃO assumir que o material já existe ou tem áudio original.',
      objetivo:
        "Consciência + prova social, gatilho de pertencimento. Estrutura de copy: abertura no clima ('Foi assim no último encontro.') + 2-3 linhas de contexto específico + fecho de convite direto, sem pressão. " +
        CTA_MOVIMENTO,
    },
  },
  {
    data: '27/07',
    agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        "Primeira entrega da série 'Repertório Bantu-Katu': fragmento/teaser de uma música do repertório do ciclo do Bumba Meu Boi (a peça completa fica para agosto), a partir do encontro de sábado (25/07/2026). Captura ainda pendente: mesmo checklist de 4 planos do protocolo, com atenção extra pra registrar um trecho musical identificável — não só imagem solta do encontro. A escolha da música ainda depende do Bruno/núcleo.",
      objetivo:
        "Mostra o repertório musical do movimento sem entregar tudo de uma vez (teaser, não a peça inteira). CTA: 'Quer ouvir o resto? Fica de olho por aqui.'",
    },
  },
]

const resultados = []

for (const post of POSTS) {
  process.stdout.write(`Gerando ${post.data} (${post.agenteChave})... `)
  const result = await executarAgente({ agenteChave: post.agenteChave, input: post.input })
  if (result.error) {
    console.log(`ERRO: ${result.error}`)
  } else {
    console.log(`OK (run ${result.runId})`)
  }
  resultados.push({ data: post.data, agenteChave: post.agenteChave, ...result })
}

const outPath = resolve(process.cwd(), 'scripts/outputs-bantukatu-julho.json')
writeFileSync(outPath, JSON.stringify(resultados, null, 2), 'utf-8')
console.log(`\nSalvo em ${outPath}`)
