/**
 * Gera o copy dos posts de julho/agosto do Bantu-Katu conforme o calendário
 * reescrito em 2026-07-09 (fonte: bantu-katu-apresentacao.vercel.app), usando
 * os agentes do catálogo do app (criativo.carrossel, criativo.reels-tiktok,
 * criativo.post-foto-real, criativo.post-estatico). Mesma lógica de
 * gerar-posts-bantukatu.mjs (replica executarAgente(), sem marcaId, Pattern C).
 *
 * Uso: node scripts/gerar-posts-bantukatu-v2.mjs
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
    const outputText = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')

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

const CTA_MOVIMENTO = "CTA padrão do pilar Movimento em ação: 'A agenda fica nos destaques.'"

const POSTS = [
  // --- JULHO ---
  {
    mes: 'julho', data: '08/07', agenteChave: 'criativo.reels-tiktok',
    input: {
      conceito:
        'Reel de registro real do encontro de sábado (04/07/2026), vivência do ciclo do Bumba Meu Boi do Tambores do Bantu-Katu. Material ainda não capturado. Direção: abertura no clima (\'Foi assim no último encontro.\'), cortes que mostram mãos/instrumento, reação genuína, um momento de dificuldade real, plano geral por último. Sem roteiro rebuscado — é registro, não produção. ' + CTA_MOVIMENTO,
      duracao: '15-30s',
    },
  },
  {
    mes: 'julho', data: '10/07', agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel 'Ciclo de Vivência: Bumba Meu Boi' (pilar As frentes): apresentar o ciclo do Bumba Meu Boi do Tambores do Bantu-Katu como ele é agora — já rolando desde junho, vai até agosto, e alguém pode entrar mesmo no meio. Estrutura: o que é → como funciona → pra quem é → quando acontece. CTA: 'Dúvidas? Chama na DM.'",
      num_slides: 5,
    },
  },
  {
    mes: 'julho', data: '13/07', agenteChave: 'criativo.reels-tiktok',
    input: {
      conceito:
        'Reel de registro real do encontro de sábado (11/07/2026) mostrando a adaptação do sotaque de matraca (tradicional) para o instrumento do movimento (tumbadora/tambor) — cena concreta da virada acontecendo, não card explicativo. Material ainda não capturado. Copy: abertura no clima + contexto do que muda no som quando o sotaque passa pro instrumento do movimento. ' + CTA_MOVIMENTO,
      duracao: '15-30s',
    },
  },
  {
    mes: 'julho', data: '15/07', agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        'Foto de registro real do encontro de sábado (11/07/2026, mais próximo desta data), vivência do ciclo do Bumba Meu Boi. Material ainda não capturado — seguir checklist de 4 planos do protocolo (mãos/instrumento, reação genuína, dificuldade real, plano geral).',
      objetivo:
        "Consciência + prova social, gatilho de pertencimento. Estrutura de copy: abertura no clima ('Foi assim no último encontro.') + 2-3 linhas de contexto específico + fecho de convite direto, sem pressão. " + CTA_MOVIMENTO,
    },
  },
  {
    mes: 'julho', data: '17/07', agenteChave: 'criativo.post-estatico',
    input: {
      tema:
        'Post de imagem única (pilar Cultura viva): Toadas de Bumba Meu Boi — o que são as toadas (cantigas) do Bumba Meu Boi, contexto cultural, conexão com o que o Bantu-Katu canta/toca no ciclo atual. CUIDADO: ficar no nível geral da tradição, sem afirmar variante/sotaque regional específico sem confirmação do Bruno. CTA: \'Salva pra não perder.\'',
      canal: 'Instagram',
    },
  },
  {
    mes: 'julho', data: '20/07', agenteChave: 'criativo.reels-tiktok',
    input: {
      conceito:
        'Reel de registro real do encontro de sábado (18/07/2026) mostrando um fragmento real de uma toada tocada/cantada no encontro. Material ainda não capturado — é registro, não produção. ' + CTA_MOVIMENTO,
      duracao: '15-30s',
    },
  },
  {
    mes: 'julho', data: '22/07', agenteChave: 'criativo.post-estatico',
    input: {
      tema:
        "Post de imagem única (pilar As frentes) — 'Contrate o Bantu-Katu': primeiro post do canal com propósito comercial explícito (a restrição de CTA comercial foi revista em 2026-07-09). Apresentar a possibilidade de contratar o Bantu-Katu para apresentações/eventos. CTA: convite direto a entrar em contato pra contratar — não é 'Chama na DM' genérico de dúvida, é CTA comercial. CUIDADO: não inventar pacotes, preços ou formato de contratação — manter no nível de 'fala com a gente' até ter esses detalhes confirmados.",
      canal: 'Instagram',
    },
  },
  {
    mes: 'julho', data: '24/07', agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel + áudio — estreia da série 'Sonoridades Bantu-Katu': apresenta o TAMBOR como instrumento do movimento — o que é, como soa, que ritmo/papel ele cumpre no ciclo do Bumba Meu Boi atual. Estrutura: título → close no tambor + o som que ele faz (áudio real de registro) → o ritmo/papel que ele cumpre no ciclo atual. CTA padrão do pilar Cultura viva: 'Salva pra não perder'.",
      num_slides: 4,
    },
  },
  {
    mes: 'julho', data: '27/07', agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        "Primeira entrega da série 'Repertório Bantu-Katu': fragmento/teaser de uma música do repertório do ciclo do Bumba Meu Boi (a peça completa fica para agosto), a partir do encontro de sábado (25/07/2026). Captura ainda pendente: atenção extra pra registrar um trecho musical identificável. A escolha da música ainda depende do Bruno/núcleo. Diferente do post de 20/07 (fragmento avulso de uma toada): esta é série contínua com identidade própria.",
      objetivo:
        "Mostra o repertório musical do movimento sem entregar tudo de uma vez (teaser). CTA: 'Quer ouvir o resto? Fica de olho por aqui.'",
    },
  },
  // --- AGOSTO ---
  {
    mes: 'agosto', data: '03/08', agenteChave: 'criativo.reels-tiktok',
    input: {
      conceito:
        'Reel de registro real do encontro de sábado (01/08/2026) mostrando parte da explicação do Bruno pro grupo — um momento real de ensino/orientação, não institucional. Material ainda não capturado. ' + CTA_MOVIMENTO,
      duracao: '15-30s',
    },
  },
  {
    mes: 'agosto', data: '12/08', agenteChave: 'criativo.post-estatico',
    input: {
      tema:
        'Post de imagem única — Dicionário Bantu-Katu (pilar Cultura viva). A palavra/termo específico ainda não foi escolhida pelo Bruno — gere a estrutura do post (título, formato de explicação: o que é / como soa tradicionalmente / gancho pro instrumento do movimento que assume o papel) com [TERMO A DEFINIR] como placeholder, seguindo o mesmo padrão do Dicionário Bantukatu já usado em julho (matraca).',
      canal: 'Instagram',
    },
  },
  {
    mes: 'agosto', data: '14/08', agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel + áudio — segunda entrega da série 'Sonoridades Bantu-Katu' (a primeira foi o tambor, em julho): apresenta a TUMBADORA como instrumento do movimento — o que é, como soa, que papel cumpre no ciclo do Bumba Meu Boi. Estrutura: título → close na tumbadora + o som que ela faz (áudio real de registro) → o ritmo/papel dela no ciclo atual. CTA padrão do pilar Cultura viva: 'Salva pra não perder'.",
      num_slides: 4,
    },
  },
  {
    mes: 'agosto', data: '17/08', agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        'Carrossel de fotos reais do encontro de sábado (15/08/2026), vivência do ciclo do Bumba Meu Boi. Material ainda não capturado — seguir checklist de 4 planos do protocolo.',
      objetivo:
        "Consciência + prova social, gatilho de pertencimento. Estrutura de copy: abertura no clima + 2-3 linhas de contexto específico + fecho de convite direto. " + CTA_MOVIMENTO,
    },
  },
  {
    mes: 'agosto', data: '24/08', agenteChave: 'criativo.post-foto-real',
    input: {
      descricao_foto:
        'Segunda entrega da série \'Repertório Bantu-Katu\': desta vez uma música do ciclo no ARRANJO COMPLETO (não fragmento, diferente do teaser de julho), a partir do encontro de sábado (22/08/2026). Captura ainda pendente. Bloqueio adicional: falta escolher qual música vira o arranjo completo, de preferência diferente da usada em julho.',
      objetivo: "Mostra o repertório completo do movimento. CTA: convite a acompanhar o repertório completo do movimento.",
    },
  },
  {
    mes: 'agosto', data: '26/08', agenteChave: 'criativo.carrossel',
    input: {
      tema:
        "Carrossel (pilar As frentes) — 'Aprendizados do Ciclo do Boi': retrospectiva do ciclo do Bumba Meu Boi (jun-ago) — o que ele trouxe pro Tambores do Bantu-Katu como grupo (não pra pessoas específicas), sem tom de 'última chance' nem despedida triste. Documenta crescimento — o próximo ciclo já está sendo construído. CTA: convite genérico a acompanhar o que vem a seguir.",
      num_slides: 5,
    },
  },
  {
    mes: 'agosto', data: '31/08', agenteChave: 'criativo.post-estatico',
    input: {
      tema:
        "Post teaser (pilar Bora junto) — 'O que vem por aí': fecha o ciclo do Bumba Meu Boi sinalizando continuidade, sem tom de despedida — é prova de que o próximo ciclo já está sendo construído. Gera curiosidade/comentário sobre o que vem a seguir (pode incluir pergunta aberta ou enquete). Não revelar tema do próximo ciclo se ainda não estiver definido.",
      canal: 'Instagram',
    },
  },
]

const resultados = []
for (const post of POSTS) {
  process.stdout.write(`Gerando ${post.mes} ${post.data} (${post.agenteChave})... `)
  const result = await executarAgente({ agenteChave: post.agenteChave, input: post.input })
  console.log(result.error ? `ERRO: ${result.error}` : `OK (run ${result.runId})`)
  resultados.push({ mes: post.mes, data: post.data, agenteChave: post.agenteChave, ...result })
}

const outPath = resolve(process.cwd(), 'scripts/outputs-bantukatu-v2.json')
writeFileSync(outPath, JSON.stringify(resultados, null, 2), 'utf-8')
console.log(`\nSalvo em ${outPath}`)
