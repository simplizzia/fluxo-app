'use server'

import { z } from 'zod'
import { requirePapel } from '@/lib/dal'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'
import { actionBuscarMarcasCliente } from '@/app/(dashboard)/board/actions'
import {
  ETAPAS,
  FORMATO_PARA_TIPO_SLUG,
  type EtapaChave,
  type CronogramaItem,
  type CronogramaMensagem,
  type CronogramaResumo,
} from './shared'

// ---------------------------------------------------------------------------
// Contexto de produtos — injetado no input dos agentes do cronograma.
// buildContextoCliente traz o Universo da marca; os produtos (tabela nova) vão
// pelo input, como uma seção que o executor anexa ao prompt.
// ---------------------------------------------------------------------------

async function contextoProdutos(marcaId: string): Promise<string> {
  const service = createServiceClient()
  const { data } = await service
    .from('produtos')
    .select('nome, sku, sabor, categoria, status, claims, observacoes')
    .eq('marca_id', marcaId)
    .order('status')

  if (!data || data.length === 0) {
    return 'Nenhum produto cadastrado para esta marca. Trabalhe sem SKUs específicos e sinalize isso.'
  }

  const ativos = data.filter((p) => p.status === 'ativo')
  const fora = data.filter((p) => p.status !== 'ativo')

  const linhas = ativos.map((p) =>
    `- ${p.nome}${p.sabor ? ` (${p.sabor})` : ''}${p.categoria ? ` — ${p.categoria}` : ''}${p.observacoes ? ` [${p.observacoes}]` : ''}`,
  )
  let txt = `PRODUTOS ATIVOS (use apenas estes, um SKU por post):\n${linhas.join('\n')}`

  if (fora.length > 0) {
    const foraLinhas = fora.map((p) => `- ${p.nome} — ${p.status}`)
    txt += `\n\nNÃO USAR (fora de escopo neste mês):\n${foraLinhas.join('\n')}`
  }
  return txt
}

// ---------------------------------------------------------------------------
// criarCronograma
// ---------------------------------------------------------------------------

const CriarSchema = z.object({
  clienteId: z.string().uuid(),
  marcaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function criarCronograma(input: {
  clienteId: string
  marcaId: string
  mesReferencia: string
}): Promise<{ id?: string; error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const parsed = CriarSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos para criar o cronograma.' }

  // A marca precisa pertencer ao cliente — não confiar no que vem da tela.
  const { marcas } = await actionBuscarMarcasCliente(input.clienteId)
  if (!marcas.some((m) => m.id === input.marcaId)) {
    return { error: 'Esta marca não pertence ao cliente selecionado.' }
  }

  const { data, error } = await supabase
    .from('cronogramas')
    .insert({
      organization_id: profile.organization_id,
      cliente_id: input.clienteId,
      marca_id: input.marcaId,
      mes_referencia: input.mesReferencia,
      status: 'rascunho',
      criado_por: profile.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    // Conflito de UNIQUE(org, marca, mes) = já existe cronograma desse mês.
    if (error?.code === '23505') {
      return { error: 'Já existe um cronograma desta marca para este mês.' }
    }
    console.error('[criarCronograma]', error?.message)
    return { error: 'Erro ao criar o cronograma.' }
  }
  return { id: data.id }
}

// ---------------------------------------------------------------------------
// listarCronogramas — todos da org, mais recentes primeiro
// ---------------------------------------------------------------------------

export async function listarCronogramas(): Promise<{ cronogramas: CronogramaResumo[] }> {
  await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const supabase = await createClient()

  const { data } = await supabase
    .from('cronogramas')
    .select('id, cliente_id, marca_id, mes_referencia, status, cliente:clientes!cliente_id(nome), marca:onboarding_marcas!marca_id(nome)')
    .order('mes_referencia', { ascending: false })

  const cronogramas: CronogramaResumo[] = (data ?? []).map((c) => ({
    id: c.id,
    cliente_id: c.cliente_id,
    marca_id: c.marca_id,
    mes_referencia: c.mes_referencia,
    status: c.status,
    marca_nome: (c.marca as { nome: string } | null)?.nome ?? '',
    cliente_nome: (c.cliente as { nome: string } | null)?.nome ?? '',
  }))
  return { cronogramas }
}

// ---------------------------------------------------------------------------
// rodarEtapa — executa o agente de uma etapa.
// As etapas de texto gravam a saída no campo do cronograma; a de calendário
// parseia o JSON e (re)cria os itens.
// ---------------------------------------------------------------------------

export async function rodarEtapa(
  cronogramaId: string,
  etapaChave: EtapaChave,
): Promise<{ output?: string; error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: cron } = await supabase
    .from('cronogramas')
    .select('id, cliente_id, marca_id, mes_referencia, briefing, temas_pilares')
    .eq('id', cronogramaId)
    .single()

  if (!cron) return { error: 'Cronograma não encontrado.' }

  const etapa = ETAPAS.find((e) => e.chave === etapaChave)
  if (!etapa) return { error: 'Etapa inválida.' }

  // Monta o input: contexto de produtos + saída das etapas anteriores relevantes.
  const produtos = await contextoProdutos(cron.marca_id)
  const input: Record<string, unknown> = {
    mes_referencia: cron.mes_referencia,
    produtos_ativos: produtos,
  }
  // Encadeia: cada etapa vê o que a anterior produziu.
  if (cron.briefing && Object.keys(cron.briefing).length > 0) {
    input.briefing = (cron.briefing as { texto?: string }).texto ?? ''
  }
  if (cron.temas_pilares && Object.keys(cron.temas_pilares).length > 0) {
    input.temas_e_pilares = (cron.temas_pilares as { texto?: string }).texto ?? ''
  }
  // Para coerência e ângulos, injeta o calendário atual.
  if (etapaChave === 'cronograma.coerencia' || etapaChave === 'cronograma.angulos-alternativos') {
    input.calendario_atual = await calendarioComoTexto(cronogramaId)
  }

  const res = await executarAgente({
    organizationId: profile.organization_id,
    agenteChave: etapaChave,
    clienteId: cron.cliente_id,
    marcaId: cron.marca_id,
    triggeredBy: profile.id,
    input,
  })

  if (res.error) return { error: res.error }
  const output = res.output ?? ''

  // Etapa de texto: grava no campo correspondente.
  if (etapa.campo) {
    const conteudo = { texto: output }
    const patch: {
      status: 'em_revisao'
      briefing?: typeof conteudo
      temas_pilares?: typeof conteudo
      analise_coerencia?: typeof conteudo
    } = { status: 'em_revisao' }
    if (etapa.campo === 'briefing') patch.briefing = conteudo
    else if (etapa.campo === 'temas_pilares') patch.temas_pilares = conteudo
    else if (etapa.campo === 'analise_coerencia') patch.analise_coerencia = conteudo

    await service.from('cronogramas').update(patch).eq('id', cronogramaId)
    return { output }
  }

  // Etapa de calendário: parseia o JSON e recria os itens.
  if (etapaChave === 'cronograma.calendario') {
    const itens = parseCalendario(output)
    if (!itens) {
      return { error: 'O agente não devolveu um calendário válido. Rode novamente.' }
    }
    await materializarItens(cronogramaId, cron.marca_id, itens)
    await service.from('cronogramas').update({ status: 'em_revisao' }).eq('id', cronogramaId)
  }

  return { output }
}

// ---------------------------------------------------------------------------
// Parsing e materialização do calendário
// ---------------------------------------------------------------------------

interface ItemBruto {
  data_publicacao?: string
  horario?: string
  pilar?: string
  sub_marca?: string
  produto?: string
  formato?: string
  tema?: string
  legenda?: string
  viabilidade?: string
  pendencia?: string
  detalhamento?: string
  ordem?: number
}

function parseCalendario(output: string): ItemBruto[] | null {
  // O modelo às vezes embrulha o JSON em ```json … ```; extrai o array.
  const match = output.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const arr = JSON.parse(match[0])
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

const VIABILIDADES = new Set(['proposta', 'roteiro_a_fechar', 'so_ia', 'depende_registro'])

async function materializarItens(
  cronogramaId: string,
  marcaMaeId: string,
  itens: ItemBruto[],
): Promise<void> {
  const service = createServiceClient()

  const { data: cron } = await service
    .from('cronogramas')
    .select('organization_id, cliente_id')
    .eq('id', cronogramaId)
    .single()
  if (!cron) return

  // Resolve nome de produto/sub-marca → id, para não gravar texto solto.
  const { data: produtos } = await service
    .from('produtos')
    .select('id, nome')
    .eq('cliente_id', cron.cliente_id)
  const produtoPorNome = new Map((produtos ?? []).map((p) => [p.nome.toLowerCase().trim(), p.id]))

  const { data: marcas } = await service
    .from('onboarding_marcas')
    .select('id, nome')
  const marcaPorNome = new Map((marcas ?? []).map((m) => [m.nome.toLowerCase().trim(), m.id]))

  // Substituição total: apaga os itens SEM card (preserva os já desmembrados)
  // e insere os novos. Rodar o calendário de novo não duplica.
  await service.from('cronograma_itens').delete().eq('cronograma_id', cronogramaId).is('card_id', null)

  const linhas = itens.map((it, i) => ({
    organization_id: cron.organization_id,
    cronograma_id: cronogramaId,
    data_publicacao: it.data_publicacao ?? null,
    horario: it.horario ?? null,
    pilar: it.pilar ?? null,
    marca_id: it.sub_marca ? (marcaPorNome.get(it.sub_marca.toLowerCase().trim()) ?? marcaMaeId) : marcaMaeId,
    produto_id: it.produto ? (produtoPorNome.get(it.produto.toLowerCase().trim()) ?? null) : null,
    formato: it.formato ?? null,
    tema: it.tema ?? null,
    legenda: it.legenda ?? null,
    viabilidade: (it.viabilidade && VIABILIDADES.has(it.viabilidade) ? it.viabilidade : 'proposta') as CronogramaItem['viabilidade'],
    pendencia: it.pendencia || null,
    detalhamento: it.detalhamento ?? null,
    ordem: typeof it.ordem === 'number' ? it.ordem : i + 1,
  }))

  if (linhas.length > 0) {
    await service.from('cronograma_itens').insert(linhas)
  }
}

async function calendarioComoTexto(cronogramaId: string): Promise<string> {
  const service = createServiceClient()
  const { data } = await service
    .from('cronograma_itens')
    .select('data_publicacao, pilar, formato, tema, legenda, viabilidade')
    .eq('cronograma_id', cronogramaId)
    .order('ordem')
  if (!data || data.length === 0) return 'Calendário ainda vazio.'
  return data
    .map(
      (i) =>
        `${i.data_publicacao ?? 's/ data'} · ${i.pilar ?? ''} · ${i.formato ?? ''} · ${i.tema ?? ''} · legenda: ${i.legenda ?? ''} · [${i.viabilidade}]`,
    )
    .join('\n')
}

// ---------------------------------------------------------------------------
// buscarCronograma — cronograma + itens + mensagens
// ---------------------------------------------------------------------------

export async function buscarCronograma(cronogramaId: string): Promise<{
  resumo?: CronogramaResumo
  briefing?: string
  temasPilares?: string
  analiseCoerencia?: string
  itens: CronogramaItem[]
  mensagens: CronogramaMensagem[]
  error?: string
}> {
  await requirePapel('socia', 'gestao', 'atendimento', 'executor')
  const supabase = await createClient()

  const { data: cron, error } = await supabase
    .from('cronogramas')
    .select(
      'id, cliente_id, marca_id, mes_referencia, status, briefing, temas_pilares, analise_coerencia, cliente:clientes!cliente_id(nome), marca:onboarding_marcas!marca_id(nome)',
    )
    .eq('id', cronogramaId)
    .single()

  if (error || !cron) return { itens: [], mensagens: [], error: 'Cronograma não encontrado.' }

  const [{ data: itens }, { data: mensagens }] = await Promise.all([
    supabase
      .from('cronograma_itens')
      .select('id, data_publicacao, horario, pilar, marca_id, produto_id, formato, tema, legenda, viabilidade, pendencia, detalhamento, ordem, card_id')
      .eq('cronograma_id', cronogramaId)
      .order('ordem'),
    supabase
      .from('cronograma_mensagens')
      .select('id, papel, conteudo, created_at')
      .eq('cronograma_id', cronogramaId)
      .order('created_at'),
  ])

  const marcaNome = (cron.marca as { nome: string } | null)?.nome ?? ''
  const clienteNome = (cron.cliente as { nome: string } | null)?.nome ?? ''

  return {
    resumo: {
      id: cron.id,
      cliente_id: cron.cliente_id,
      marca_id: cron.marca_id,
      mes_referencia: cron.mes_referencia,
      status: cron.status,
      marca_nome: marcaNome,
      cliente_nome: clienteNome,
    },
    briefing: (cron.briefing as { texto?: string })?.texto,
    temasPilares: (cron.temas_pilares as { texto?: string })?.texto,
    analiseCoerencia: (cron.analise_coerencia as { texto?: string })?.texto,
    itens: (itens ?? []) as CronogramaItem[],
    mensagens: (mensagens ?? []) as CronogramaMensagem[],
  }
}

// ---------------------------------------------------------------------------
// atualizarItem — edição direta na tabela de revisão
// ---------------------------------------------------------------------------

const ItemPatchSchema = z.object({
  data_publicacao: z.string().nullable().optional(),
  horario: z.string().nullable().optional(),
  pilar: z.string().nullable().optional(),
  produto_id: z.string().uuid().nullable().optional(),
  formato: z.string().nullable().optional(),
  tema: z.string().nullable().optional(),
  legenda: z.string().nullable().optional(),
  viabilidade: z.enum(['proposta', 'roteiro_a_fechar', 'so_ia', 'depende_registro']).optional(),
  pendencia: z.string().nullable().optional(),
})

export async function atualizarItem(
  itemId: string,
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const parsed = ItemPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Alteração inválida.' }

  const { error } = await supabase.from('cronograma_itens').update(parsed.data).eq('id', itemId)
  if (error) {
    console.error('[atualizarItem]', error.message)
    return { error: 'Erro ao salvar a alteração.' }
  }
  return {}
}

// ---------------------------------------------------------------------------
// excluirItem
// ---------------------------------------------------------------------------

export async function excluirItem(itemId: string): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const { error } = await supabase.from('cronograma_itens').delete().eq('id', itemId)
  if (error) return { error: 'Erro ao excluir o item.' }
  return {}
}

// ---------------------------------------------------------------------------
// aprovarCronograma
// ---------------------------------------------------------------------------

export async function aprovarCronograma(cronogramaId: string): Promise<{ error?: string }> {
  await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()

  const { data: itens } = await supabase
    .from('cronograma_itens')
    .select('id')
    .eq('cronograma_id', cronogramaId)
    .limit(1)

  if (!itens || itens.length === 0) {
    return { error: 'O cronograma precisa ter ao menos um post antes de ser aprovado.' }
  }

  const { error } = await supabase
    .from('cronogramas')
    .update({ status: 'aprovado' })
    .eq('id', cronogramaId)
  if (error) return { error: 'Erro ao aprovar.' }
  return {}
}

// ---------------------------------------------------------------------------
// desmembrarCronograma — cria um card por item. Idempotente: só toca itens sem
// card_id, então rodar duas vezes não duplica.
// ---------------------------------------------------------------------------

export async function desmembrarCronograma(
  cronogramaId: string,
): Promise<{ criados?: number; error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const service = createServiceClient()

  const { data: cron } = await service
    .from('cronogramas')
    .select('id, organization_id, cliente_id, marca_id, status')
    .eq('id', cronogramaId)
    .single()

  if (!cron) return { error: 'Cronograma não encontrado.' }
  if (cron.status !== 'aprovado' && cron.status !== 'desmembrado') {
    return { error: 'Aprove o cronograma antes de gerar os cards.' }
  }

  const { data: itens } = await service
    .from('cronograma_itens')
    .select('id, data_publicacao, formato, tema, pilar, legenda, marca_id, produto_id')
    .eq('cronograma_id', cronogramaId)
    .is('card_id', null)
    .order('ordem')

  if (!itens || itens.length === 0) {
    // Nada a fazer — ou já foi tudo desmembrado.
    await service.from('cronogramas').update({ status: 'desmembrado' }).eq('id', cronogramaId)
    return { criados: 0 }
  }

  // Slugs de formato → tipos_demanda.id (uma consulta).
  const slugs = [...new Set(Object.values(FORMATO_PARA_TIPO_SLUG))]
  const { data: tipos } = await service
    .from('tipos_demanda')
    .select('id, slug')
    .eq('organization_id', cron.organization_id)
    .in('slug', slugs)
  const tipoIdPorSlug = new Map((tipos ?? []).map((t) => [t.slug, t.id]))

  // Nome dos produtos para guardar em campos_publicos (cards não têm produto_id).
  const { data: produtos } = await service
    .from('produtos')
    .select('id, nome')
    .eq('cliente_id', cron.cliente_id)
  const nomePorProduto = new Map((produtos ?? []).map((p) => [p.id, p.nome]))

  let criados = 0
  for (const it of itens) {
    const slug = FORMATO_PARA_TIPO_SLUG[it.formato ?? ''] ?? 'post-feed'
    const tipoId = tipoIdPorSlug.get(slug) ?? tipoIdPorSlug.get('post-feed')
    if (!tipoId) continue // organização sem os tipos de conteúdo seedados

    const { data: card, error: cardErr } = await service
      .from('cards')
      .insert({
        organization_id: cron.organization_id,
        cliente_id: cron.cliente_id,
        marca_id: it.marca_id ?? cron.marca_id,
        tipo_id: tipoId,
        titulo: it.tema ?? 'Post',
        status: 'a_fazer',
        prioridade: 'normal',
        data_publicacao: it.data_publicacao,
        criado_por: profile.id,
        campos_publicos: {
          tema: it.tema ?? '',
          pilar: it.pilar ?? '',
          legenda: it.legenda ?? '',
          produto: it.produto_id ? (nomePorProduto.get(it.produto_id) ?? '') : '',
          origem: 'cronograma',
        },
      })
      .select('id')
      .single()

    if (cardErr || !card) {
      console.error('[desmembrarCronograma] card:', cardErr?.message)
      continue
    }

    await service.from('cronograma_itens').update({ card_id: card.id }).eq('id', it.id)
    criados++
  }

  await service.from('cronogramas').update({ status: 'desmembrado' }).eq('id', cronogramaId)
  return { criados }
}

// ---------------------------------------------------------------------------
// enviarMensagemRevisao — chat da revisão.
// Registra a instrução da equipe e reexecuta o calendário com todas as
// instruções acumuladas da rodada, re-materializando os itens sem card. É como
// as rodadas da Ehrmann funcionaram: regenerar com o feedback acumulado.
// Edições cirúrgicas de célula ficam por conta de atualizarItem.
// ---------------------------------------------------------------------------

export async function enviarMensagemRevisao(
  cronogramaId: string,
  texto: string,
): Promise<{ resposta?: string; error?: string }> {
  const profile = await requirePapel('socia', 'gestao', 'atendimento')
  const supabase = await createClient()
  const service = createServiceClient()

  const conteudo = texto.trim()
  if (!conteudo) return { error: 'Escreva a instrução de ajuste.' }

  const { data: cron } = await supabase
    .from('cronogramas')
    .select('id, organization_id, cliente_id, marca_id, mes_referencia')
    .eq('id', cronogramaId)
    .single()
  if (!cron) return { error: 'Cronograma não encontrado.' }

  // Registra a mensagem da equipe.
  await service.from('cronograma_mensagens').insert({
    organization_id: cron.organization_id,
    cronograma_id: cronogramaId,
    papel: 'equipe',
    autor_id: profile.id,
    conteudo,
  })

  // Reúne as instruções da rodada (todas as mensagens da equipe).
  const { data: msgs } = await service
    .from('cronograma_mensagens')
    .select('conteudo, papel')
    .eq('cronograma_id', cronogramaId)
    .eq('papel', 'equipe')
    .order('created_at')
  const instrucoes = (msgs ?? []).map((m) => `- ${m.conteudo}`).join('\n')

  const res = await executarAgente({
    organizationId: cron.organization_id,
    agenteChave: 'cronograma.calendario',
    clienteId: cron.cliente_id,
    marcaId: cron.marca_id,
    triggeredBy: profile.id,
    input: {
      mes_referencia: cron.mes_referencia,
      produtos_ativos: await contextoProdutos(cron.marca_id),
      calendario_atual: await calendarioComoTexto(cronogramaId),
      ajustes_solicitados: instrucoes,
    },
  })

  if (res.error) return { error: res.error }

  const itens = parseCalendario(res.output ?? '')
  if (!itens) {
    return { error: 'Não consegui aplicar o ajuste ao calendário. Tente reformular.' }
  }
  await materializarItens(cronogramaId, cron.marca_id, itens)

  const resposta = `Apliquei o ajuste. O calendário foi atualizado (${itens.length} posts).`
  await service.from('cronograma_mensagens').insert({
    organization_id: cron.organization_id,
    cronograma_id: cronogramaId,
    papel: 'agente',
    conteudo: resposta,
  })

  return { resposta }
}
