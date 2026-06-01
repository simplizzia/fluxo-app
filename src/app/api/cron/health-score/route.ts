/**
 * Cron: /api/cron/health-score
 * Schedule: "0 6 * * *" — 06h UTC diário
 *
 * Para cada cliente ativo calcula o Health Score (5 métricas) e grava em
 * health_scores. Gera alertas por email (com anti-spam via audit_log).
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarEmailsEquipe, enviarEmail } from '@/lib/email'
// (enviarEmail é usado em processarAlertas — não usar Resend diretamente)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface ClienteComPlano {
  id: string
  nome: string
  planos_cliente: Array<{
    limite_demandas_mes: number
    data_renovacao: string
  }>
}

interface ScoreComponentes {
  taxa_aprovacao: number
  rodadas_revisao: number
  uso_plano: number
  nota_avaliacoes: number
  tempo_resposta: number
  cards_criados: number   // valor bruto — para alertas de "zero atividade"
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = request.headers.get('Authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const dataAtual = new Date()
  const hoje = dataAtual.toISOString().split('T')[0]

  const { data: orgs } = await supabase.from('organizacoes').select('id')

  let calculados = 0
  let emailsEnviados = 0

  for (const org of orgs ?? []) {
    const { data: clientesRaw } = await supabase
      .from('clientes')
      .select('id, nome, planos_cliente(limite_demandas_mes, data_renovacao)')
      .eq('organization_id', org.id)
      .eq('status', 'ativo')

    const clientes = (clientesRaw ?? []) as unknown as ClienteComPlano[]

    for (const c of clientes) {
      try {
        const { total, componentes } = await calcularHealthScore(
          supabase,
          org.id,
          c,
          dataAtual,
        )

        await supabase.from('health_scores').insert({
          organization_id: org.id,
          cliente_id: c.id,
          score: total,
          componentes: componentes as unknown as import('@/types/database').Json,
        })

        calculados++

        // Busca score anterior (ontem) para detectar queda
        const ontem = new Date(dataAtual)
        ontem.setDate(ontem.getDate() - 1)
        const { data: scoreAnterior } = await supabase
          .from('health_scores')
          .select('score')
          .eq('organization_id', org.id)
          .eq('cliente_id', c.id)
          .lt('calculado_em', ontem.toISOString())
          .order('calculado_em', { ascending: false })
          .limit(1)
          .maybeSingle()

        const emails = await processarAlertas(
          supabase,
          org.id,
          c,
          total,
          componentes,
          scoreAnterior?.score ?? null,
          hoje,
        )

        emailsEnviados += emails
      } catch (err) {
        console.error(`[health-score] Erro cliente ${c.id}:`, err)
      }
    }
  }

  return NextResponse.json({ ok: true, calculados, emailsEnviados })
}

// ---------------------------------------------------------------------------
// Cálculo do Health Score
// ---------------------------------------------------------------------------

async function calcularHealthScore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  cliente: ClienteComPlano,
  agora: Date,
): Promise<{ total: number; componentes: ScoreComponentes }> {
  const h30 = new Date(agora)
  h30.setDate(h30.getDate() - 30)
  const h30Str = h30.toISOString()

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const h5 = new Date(agora)
  h5.setDate(h5.getDate() - 5)

  // ── 1. Taxa de aprovação no prazo (30%) ───────────────────────────────────
  const { data: concluidos } = await supabase
    .from('cards')
    .select('prazo_cliente, updated_at')
    .eq('organization_id', orgId)
    .eq('cliente_id', cliente.id)
    .eq('status', 'concluido')
    .gte('updated_at', h30Str)
    .not('prazo_cliente', 'is', null)

  const listaC = (concluidos ?? []) as Array<{ prazo_cliente: string; updated_at: string }>
  const noPrazo = listaC.filter((c) => c.prazo_cliente >= c.updated_at.split('T')[0]).length
  const taxaAprovacao = listaC.length > 0 ? Math.round((noPrazo / listaC.length) * 100) : 75

  // ── 2. Rodadas de revisão (20%) ───────────────────────────────────────────
  const { data: rodadasRaw } = await supabase
    .from('cards')
    .select('rodadas_revisao')
    .eq('organization_id', orgId)
    .eq('cliente_id', cliente.id)
    .eq('status', 'concluido')
    .gte('updated_at', h30Str)

  const rodadasLista = (rodadasRaw ?? []) as Array<{ rodadas_revisao: number }>
  const rodadasMedia =
    rodadasLista.length > 0
      ? rodadasLista.reduce((s, c) => s + (c.rodadas_revisao ?? 1), 0) / rodadasLista.length
      : 1
  // 1 rodada → 100, 2 → 60, 3 → 20, 3.5+ → 0
  const rodadasScore = Math.max(0, Math.min(100, Math.round(((3.5 - rodadasMedia) / 2.5) * 100)))

  // ── 3. Uso do plano (20%) ─────────────────────────────────────────────────
  const plano = cliente.planos_cliente?.[0]
  const limite = plano?.limite_demandas_mes ?? 10

  const { count: cardsNoMes } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('cliente_id', cliente.id)
    .neq('status', 'cancelado')
    .gte('created_at', inicioMes)
    .lte('created_at', fimMes)

  const pctUso = Math.round(((cardsNoMes ?? 0) / limite) * 100)
  const usoScore =
    pctUso < 20 ? 50
    : pctUso < 40 ? 72
    : pctUso < 80 ? 100
    : pctUso < 100 ? 72
    : 45

  // ── 4. Nota de avaliações (20%) ───────────────────────────────────────────
  // Sprint 2.4 adiciona NPS. Por enquanto usa default neutro ou avaliações existentes.
  const { data: avaliacoes } = await supabase
    .from('avaliacoes_cliente')
    .select('nps, qualidade, comunicacao')
    .eq('organization_id', orgId)
    .eq('cliente_id', cliente.id)
    .not('respondido_em', 'is', null)
    .gte('respondido_em', h30Str)
    .order('respondido_em', { ascending: false })
    .limit(3)

  const listaAval = (avaliacoes ?? []) as Array<{
    nps: number | null
    qualidade: number | null
    comunicacao: number | null
  }>

  let avaliacoesScore = 75
  if (listaAval.length > 0) {
    const scores = listaAval.map((a) => {
      const npsScore = a.nps != null ? (a.nps / 10) * 100 : 75
      const qualScore = a.qualidade != null ? (a.qualidade / 5) * 100 : 75
      const comScore = a.comunicacao != null ? (a.comunicacao / 5) * 100 : 75
      return (npsScore + qualScore + comScore) / 3
    })
    avaliacoesScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
  }

  // ── 5. Tempo de resposta (10%) ─────────────────────────────────────────────
  // Proxy: cards em para_aprovacao há >5 dias
  const { count: aprovTardias } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('cliente_id', cliente.id)
    .eq('status', 'para_aprovacao')
    .lt('updated_at', h5.toISOString())

  const tempoRespostaScore =
    (aprovTardias ?? 0) === 0 ? 90 : (aprovTardias ?? 0) === 1 ? 55 : 25

  // ── Score final ───────────────────────────────────────────────────────────
  const componentes: ScoreComponentes = {
    taxa_aprovacao: taxaAprovacao,
    rodadas_revisao: rodadasScore,
    uso_plano: usoScore,
    nota_avaliacoes: avaliacoesScore,
    tempo_resposta: tempoRespostaScore,
    cards_criados: cardsNoMes ?? 0,
  }

  const total = Math.round(
    taxaAprovacao * 0.3 +
    rodadasScore * 0.2 +
    usoScore * 0.2 +
    avaliacoesScore * 0.2 +
    tempoRespostaScore * 0.1,
  )

  return { total, componentes }
}

// ---------------------------------------------------------------------------
// Processamento de alertas (email + audit_log)
// ---------------------------------------------------------------------------

interface AlertaDef {
  tipo: string
  titulo: string
  descricao: string
  severidade: 'alta' | 'media' | 'baixa'
  antispamDias: number  // não envia se já enviou nos últimos X dias
}

async function processarAlertas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  cliente: ClienteComPlano,
  score: number,
  componentes: ScoreComponentes,
  scoreAnterior: number | null,
  hoje: string,
): Promise<number> {
  const alertas: AlertaDef[] = []

  // 1. Score em zona vermelha (<40)
  if (score < 40) {
    alertas.push({
      tipo: 'score_vermelho',
      titulo: `Saúde crítica: ${cliente.nome}`,
      descricao: `Health Score de ${score}/100 — cliente em zona de risco.`,
      severidade: 'alta',
      antispamDias: 3,
    })
  }

  // 2. Queda de >20 pontos em relação ao score anterior
  if (scoreAnterior != null && scoreAnterior - score >= 20) {
    alertas.push({
      tipo: 'score_queda',
      titulo: `Queda de saúde: ${cliente.nome}`,
      descricao: `Health Score caiu de ${scoreAnterior} para ${score} (−${scoreAnterior - score} pts).`,
      severidade: 'alta',
      antispamDias: 7,
    })
  }

  // 3. Aprovação aguardando >5 dias
  if (componentes.tempo_resposta < 60) {
    alertas.push({
      tipo: 'aprovacao_atrasada',
      titulo: `Aprovação atrasada: ${cliente.nome}`,
      descricao: `Card(s) em "Para aprovação" sem resposta há mais de 5 dias.`,
      severidade: 'alta',
      antispamDias: 2,
    })
  }

  // 4. Sub-utilização do plano (1–19% do plano utilizado)
  // uso_plano=50 → pctUso < 20%; exclui zero (coberto pelo alerta sem_atividade)
  if (componentes.uso_plano <= 50 && componentes.cards_criados > 0) {
    alertas.push({
      tipo: 'sub_utilizacao',
      titulo: `Sub-utilização: ${cliente.nome}`,
      descricao: `Menos de 20% do plano utilizado — cliente pode não estar aproveitando o serviço.`,
      severidade: 'baixa',
      antispamDias: 15,
    })
  }

  // 5. Renovação de contrato em ≤30 dias
  const plano = cliente.planos_cliente?.[0]
  if (plano?.data_renovacao) {
    const diasAteRenov = Math.ceil(
      (new Date(plano.data_renovacao).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
    if (diasAteRenov >= 0 && diasAteRenov <= 30) {
      alertas.push({
        tipo: 'renovacao_contrato',
        titulo: `Renovação próxima: ${cliente.nome}`,
        descricao: `Contrato renova em ${diasAteRenov} dia${diasAteRenov !== 1 ? 's' : ''} (${plano.data_renovacao}).`,
        severidade: 'media',
        antispamDias: 7,
      })
    }
  }

  // 6. Sem atividade no mês (literalmente 0 cards criados)
  if (componentes.cards_criados === 0) {
    alertas.push({
      tipo: 'sem_atividade',
      titulo: `Sem atividade: ${cliente.nome}`,
      descricao: `Nenhuma demanda criada neste mês — risco de desengajamento.`,
      severidade: 'media',
      antispamDias: 10,
    })
  }

  if (alertas.length === 0) return 0

  const emails = await buscarEmailsEquipe(orgId, ['socia', 'atendimento'])
  if (!emails.length) return 0

  let enviados = 0

  for (const alerta of alertas) {
    // Anti-spam: verifica se já enviamos este tipo de alerta nos últimos X dias
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - alerta.antispamDias)

    const { count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('acao', `cs.${alerta.tipo}`)
      .eq('entidade', 'clientes')
      .eq('entidade_id', cliente.id)
      .gte('created_at', dataLimite.toISOString())

    if ((count ?? 0) > 0) continue

    // Envia email
    const { subject, html } = emailCSAlerta({
      clienteNome: cliente.nome,
      titulo: alerta.titulo,
      descricao: alerta.descricao,
      score,
      severidade: alerta.severidade,
    })

    try {
      await enviarEmail(emails, subject, html)

      // Log anti-spam
      await supabase.from('audit_log').insert({
        organization_id: orgId,
        acao: `cs.${alerta.tipo}`,
        entidade: 'clientes',
        entidade_id: cliente.id,
        metadata: { score, scoreAnterior, titulo: alerta.titulo },
      })

      enviados++
    } catch (err) {
      console.error(`[health-score] Erro ao enviar email ${alerta.tipo}:`, err)
    }
  }

  return enviados
}

// ---------------------------------------------------------------------------
// Template de email para alerta de CS
// ---------------------------------------------------------------------------

function emailCSAlerta(opts: {
  clienteNome: string
  titulo: string
  descricao: string
  score: number
  severidade: 'alta' | 'media' | 'baixa'
}): { subject: string; html: string } {
  const { clienteNome, titulo, descricao, score, severidade } = opts

  const corScore =
    score >= 70 ? '#16a34a'
    : score >= 40 ? '#d97706'
    : '#dc2626'

  const badgeCor =
    severidade === 'alta' ? '#dc2626'
    : severidade === 'media' ? '#d97706'
    : '#64748b'

  const subject = `⚠️ CS: ${titulo}`

  const html = `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#6C3DB5 0%,#A046C6 100%);padding:28px 32px">
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,.8);font-weight:600;letter-spacing:.05em;text-transform:uppercase">Customer Success</p>
    <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;line-height:1.3">${titulo}</h1>
  </div>
  <div style="padding:28px 32px">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <div style="text-align:center;background:#f8fafc;border-radius:12px;padding:14px 20px;border:1px solid #e2e8f0">
        <p style="margin:0;font-size:28px;font-weight:800;color:${corScore};line-height:1">${score}</p>
        <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Health Score</p>
      </div>
      <div>
        <p style="margin:0;font-size:13px;color:#64748b">Cliente</p>
        <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#0f172a">${clienteNome}</p>
      </div>
    </div>
    <div style="background:#fafafa;border-radius:10px;border:1px solid #e2e8f0;padding:14px 16px;margin-bottom:20px">
      <span style="display:inline-block;background:${badgeCor};color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:999px;margin-bottom:8px">Alerta ${severidade === 'alta' ? '🔴 Alto' : severidade === 'media' ? '🟡 Médio' : '⚪ Baixo'}</span>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.5">${descricao}</p>
    </div>
    <a href="${APP_URL}/cs" style="display:inline-block;background:linear-gradient(135deg,#6C3DB5,#A046C6);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px">
      Ver Customer Success →
    </a>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">Izzi · Simplizzia — <a href="${APP_URL}/cs" style="color:#A046C6;text-decoration:none">Gerenciar alertas</a></p>
  </div>
</div></body></html>`

  return { subject, html }
}
