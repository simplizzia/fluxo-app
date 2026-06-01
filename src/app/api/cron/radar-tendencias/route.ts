import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'
import { verificarRegraAtiva, logAutomacao } from '@/lib/automacao'

// Padrão B — Radar de Tendências
// Frequência: diário (configurado em vercel.json)
// Para cada org, verifica se há uma "nota de tendências" pendente para hoje
// e gera um relatório de tendências se a regra estiver ativa.
// Nota: a coleta manual dos dados de tendências deve ser feita pela equipe
// e inserida como input — este cron processa orgs que têm input pendente.

export const dynamic = 'force-dynamic'

const GATILHO = 'radar_tendencias_diario'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const resultados: Array<{ org: string; status: string }> = []

  // Busca organizações ativas
  const { data: orgs } = await service
    .from('organizacoes')
    .select('id, nome')
    .eq('ativo', true)

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ ok: true, message: 'Nenhuma organização ativa.' })
  }

  for (const org of orgs) {
    const { regra_id, ativa } = await verificarRegraAtiva(org.id as string, GATILHO)
    if (!ativa) {
      resultados.push({ org: org.nome as string, status: 'regra_inativa' })
      continue
    }

    // Verifica se há inputs de tendências pendentes para hoje
    // (registros em uma tabela de fila ou audit_log marcados como 'tendencias_input')
    const hoje = new Date().toISOString().split('T')[0]
    const { data: inputPendente } = await service
      .from('audit_log')
      .select('id, detalhes')
      .eq('organization_id', org.id)
      .eq('acao', 'tendencias_input_pendente')
      .gte('criado_em', `${hoje}T00:00:00Z`)
      .limit(1)
      .single()

    if (!inputPendente) {
      resultados.push({ org: org.nome as string, status: 'sem_input_pendente' })
      continue
    }

    // Executa o agente com o input coletado
    const input = (inputPendente.detalhes as Record<string, unknown>) ?? {}
    const result = await executarAgente({
      organizationId: org.id as string,
      agenteChave: 'monitoramento.radar-tendencias',
      input: {
        tendencias_observadas: input.tendencias ?? 'Análise diária — aguardando coleta manual.',
        setor_cliente: input.setor ?? '',
      },
    })

    if (regra_id) {
      await logAutomacao({
        organizationId: org.id as string,
        regra_id,
        entidade: 'agent_runs',
        entidade_id: result.runId ?? '',
        sucesso: !result.error,
        detalhes: result.error ? { erro: result.error } : { tokens: (result.tokensInput ?? 0) + (result.tokensOutput ?? 0) },
      })
    }

    // Marca o input como processado
    await service
      .from('audit_log')
      .update({ acao: 'tendencias_input_processado' })
      .eq('id', inputPendente.id)

    resultados.push({
      org: org.nome as string,
      status: result.error ? `falhou: ${result.error}` : 'executado',
    })
  }

  return NextResponse.json({ ok: true, processados: resultados.length, resultados })
}
