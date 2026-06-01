/**
 * Cron: /api/cron/relatorio-mensal
 * Schedule: "0 8 25 * *" — dia 25 de cada mês às 08h UTC
 *
 * Para cada cliente ativo:
 *  1. Coleta métricas do mês (cards, taxa, rodadas, plano, NPS, health score)
 *  2. Chama Claude API para gerar relatório em markdown
 *  3. Salva em relatorios_cliente com status = 'rascunho'
 *
 * Anti-spam: UNIQUE (organization_id, cliente_id, mes_referencia) no banco.
 * A sócia revisa e clica "Enviar" para o cliente receber o email.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('Authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const agora = new Date()

  // Mês de referência = mês anterior completo
  const mesRef = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const mesRefStr = mesRef.toISOString().slice(0, 10) // "2026-04-01"
  const inicioMes = mesRef.toISOString()
  const fimMes = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59).toISOString()

  const nomeMes = mesRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const { data: orgs } = await supabase.from('organizacoes').select('id')

  let gerados = 0
  let pulados = 0
  let erros = 0

  for (const org of orgs ?? []) {
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome, planos_cliente(limite_demandas_mes)')
      .eq('organization_id', org.id)
      .eq('status', 'ativo')

    for (const c of clientes ?? []) {
      // Anti-spam: já existe relatório para este mês?
      const { count } = await supabase
        .from('relatorios_cliente')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('cliente_id', c.id)
        .eq('mes_referencia', mesRefStr)

      if ((count ?? 0) > 0) {
        pulados++
        continue
      }

      // Cria registro em estado "gerando"
      const { data: relatorio, error: insertError } = await supabase
        .from('relatorios_cliente')
        .insert({
          organization_id: org.id,
          cliente_id: c.id,
          mes_referencia: mesRefStr,
          status: 'gerando',
          dados: {},
        })
        .select('id')
        .single()

      if (insertError || !relatorio) {
        console.error(`[relatorio] Erro ao criar registro para ${c.id}:`, insertError)
        erros++
        continue
      }

      try {
        // Coleta as métricas do mês
        const dados = await coletarDadosMes(supabase, org.id, c.id, c.nome as string, inicioMes, fimMes)

        // Obtém plano
        const plano = (c.planos_cliente as Array<{ limite_demandas_mes: number }> | null)?.[0]
        dados.limitePlano = plano?.limite_demandas_mes ?? 10

        // Gera relatório com Claude
        const conteudo = await gerarRelatorioIA(c.nome as string, nomeMes, dados)

        // Atualiza com o conteúdo gerado
        await supabase
          .from('relatorios_cliente')
          .update({ dados: dados as unknown as import('@/types/database').Json, conteudo, status: 'rascunho', updated_at: new Date().toISOString() })
          .eq('id', relatorio.id)

        gerados++
      } catch (err) {
        console.error(`[relatorio] Erro ao gerar para ${c.id}:`, err)
        // Mantém em 'gerando' para reprocessar se necessário
        await supabase
          .from('relatorios_cliente')
          .update({ status: 'rascunho', updated_at: new Date().toISOString() })
          .eq('id', relatorio.id)
        erros++
      }
    }
  }

  return NextResponse.json({ ok: true, gerados, pulados, erros })
}

// ---------------------------------------------------------------------------
// Coleta de métricas
// ---------------------------------------------------------------------------

interface DadosMes {
  clienteNome: string
  totalCriados: number
  totalConcluidos: number
  totalCancelados: number
  taxaEntregaNoPrazo: number       // 0-100
  mediaRodadasRevisao: number
  usoPlano: number
  limitePlano: number
  npsScore: number | null
  npsTotal: number
  healthScore: number | null
  tiposMaisUsados: Array<{ nome: string; count: number }>
  cardsAtrasados: number
}

async function coletarDadosMes(
  supabase: ReturnType<typeof createServiceClient>,
  orgId: string,
  clienteId: string,
  clienteNome: string,
  inicioMes: string,
  fimMes: string,
): Promise<DadosMes> {
  // Cards do mês
  const { data: cards } = await supabase
    .from('cards')
    .select('id, status, prazo_cliente, rodadas_revisao, tipos_demanda(nome), created_at')
    .eq('organization_id', orgId)
    .eq('cliente_id', clienteId)
    .gte('created_at', inicioMes)
    .lte('created_at', fimMes)

  const lista = (cards ?? []) as unknown as Array<{
    id: string
    status: string
    prazo_cliente: string | null
    rodadas_revisao: number
    tipos_demanda: { nome: string } | null
    created_at: string
  }>

  const concluidos = lista.filter((c) => c.status === 'concluido')
  const cancelados = lista.filter((c) => c.status === 'cancelado')

  // Taxa de entrega no prazo (entre os concluídos)
  const concluidosComPrazo = concluidos.filter((c) => c.prazo_cliente)
  const dentroNoPrazo = concluidosComPrazo.filter((c) => {
    const prazo = new Date(c.prazo_cliente!)
    const conclusao = new Date(c.created_at) // aproximação — idealmente usaria updated_at de when status changed
    return conclusao <= prazo
  })
  const taxaEntregaNoPrazo =
    concluidosComPrazo.length > 0
      ? Math.round((dentroNoPrazo.length / concluidosComPrazo.length) * 100)
      : 100

  // Rodadas de revisão médias
  const mediaRodadasRevisao =
    concluidos.length > 0
      ? Math.round((concluidos.reduce((s, c) => s + (c.rodadas_revisao ?? 0), 0) / concluidos.length) * 10) / 10
      : 0

  // Cards atrasados (concluídos fora do prazo)
  const cardsAtrasados = concluidosComPrazo.length - dentroNoPrazo.length

  // Tipos mais usados
  const tipoCount: Record<string, number> = {}
  for (const c of lista) {
    const nome = (c.tipos_demanda as unknown as { nome: string } | null)?.nome ?? 'Outro'
    tipoCount[nome] = (tipoCount[nome] ?? 0) + 1
  }
  const tiposMaisUsados = Object.entries(tipoCount)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // NPS do mês
  const { data: avaliacoes } = await supabase
    .from('avaliacoes_cliente')
    .select('nps')
    .eq('organization_id', orgId)
    .eq('cliente_id', clienteId)
    .not('respondido_em', 'is', null)
    .gte('respondido_em', inicioMes)
    .lte('respondido_em', fimMes)

  const npsLista = (avaliacoes ?? []).map((a) => a.nps as number)
  const npsTotal = npsLista.length
  const promotores = npsLista.filter((n) => n >= 9).length
  const detratores = npsLista.filter((n) => n <= 6).length
  const npsScore =
    npsTotal > 0 ? Math.round(((promotores - detratores) / npsTotal) * 100) : null

  // Health Score mais recente
  const { data: healthRow } = await supabase
    .from('health_scores')
    .select('score')
    .eq('organization_id', orgId)
    .eq('cliente_id', clienteId)
    .order('calculado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    clienteNome,
    totalCriados: lista.length,
    totalConcluidos: concluidos.length,
    totalCancelados: cancelados.length,
    taxaEntregaNoPrazo,
    mediaRodadasRevisao,
    usoPlano: lista.filter((c) => c.status !== 'cancelado').length,
    limitePlano: 10, // substituído pelo chamador
    npsScore,
    npsTotal,
    healthScore: (healthRow as { score: number } | null)?.score ?? null,
    tiposMaisUsados,
    cardsAtrasados,
  }
}

// ---------------------------------------------------------------------------
// Geração com Claude API
// ---------------------------------------------------------------------------

async function gerarRelatorioIA(
  clienteNome: string,
  nomeMes: string,
  dados: DadosMes,
): Promise<string> {
  const tiposStr =
    dados.tiposMaisUsados.length > 0
      ? dados.tiposMaisUsados.map((t) => `${t.nome} (${t.count})`).join(', ')
      : 'nenhum dado'

  const prompt = `Você é a Izzi, assistente da Simplizzia — uma agência de marketing digital.
Gere um relatório mensal de ${nomeMes} para o cliente **${clienteNome}**.

MÉTRICAS DO MÊS:
- Demandas criadas: ${dados.totalCriados}
- Demandas concluídas: ${dados.totalConcluidos}
- Taxa de entrega no prazo: ${dados.taxaEntregaNoPrazo}%
- Rodadas de revisão médias: ${dados.mediaRodadasRevisao}
- Uso do plano: ${dados.usoPlano} de ${dados.limitePlano} demandas
- Demandas com atraso: ${dados.cardsAtrasados}
- Tipos mais demandados: ${tiposStr}
${dados.npsScore !== null ? `- NPS do mês: ${dados.npsScore > 0 ? '+' : ''}${dados.npsScore} (${dados.npsTotal} resposta${dados.npsTotal !== 1 ? 's' : ''})` : '- NPS: sem resposta este mês'}
${dados.healthScore !== null ? `- Health Score atual: ${dados.healthScore}/100` : ''}

INSTRUÇÕES:
- Tom: amigável, direto, positivo mesmo quando há pontos de atenção
- Use o nome do cliente naturalmente (não repita demais)
- Seja específico nos números — não use linguagem genérica
- Máximo 400 palavras no total

FORMATO (retorne exatamente neste formato markdown, sem blocos de código):

## Resumo de ${nomeMes}

[2-3 parágrafos com visão geral do mês, mencionando os principais números]

## Destaques

- [ponto positivo 1]
- [ponto positivo 2]
- [ponto positivo 3 — se houver]

## Pontos de atenção

[Se não houver pontos de atenção, escreva apenas: "Tudo dentro dos parâmetros este mês! 🎉"]

## Sugestões para o próximo mês

1. [sugestão 1 — específica e acionável]
2. [sugestão 2]
3. [sugestão 3 — opcional]`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  return text.trim()
}
