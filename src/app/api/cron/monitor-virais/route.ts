import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { executarAgente } from '@/lib/agents/executor'
import { verificarRegraAtiva, logAutomacao } from '@/lib/automacao'

// Padrão B — Monitor de Virais
// Frequência: a cada 4h (configurado em vercel.json)
// Processa inputs de virais submetidos manualmente pela equipe
// aguardando na fila (audit_log.acao = 'virais_input_pendente')

export const dynamic = 'force-dynamic'

const GATILHO = 'monitor_virais_4h'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const resultados: Array<{ org: string; status: string }> = []

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

    // Processa todos os inputs de virais pendentes desta org
    const { data: inputs } = await service
      .from('audit_log')
      .select('id, detalhes')
      .eq('organization_id', org.id)
      .eq('acao', 'virais_input_pendente')
      .order('criado_em', { ascending: true })
      .limit(5) // processa até 5 por execução para não sobrecarregar

    if (!inputs || inputs.length === 0) {
      resultados.push({ org: org.nome as string, status: 'sem_input_pendente' })
      continue
    }

    for (const inputRec of inputs) {
      const details = (inputRec.detalhes as Record<string, unknown>) ?? {}
      const clienteId = details.cliente_id as string | undefined

      const result = await executarAgente({
        organizationId: org.id as string,
        agenteChave: 'monitoramento.monitor-virais',
        clienteId,
        input: {
          virais_identificados: (details.virais as string) ?? 'Virais identificados — aguardando análise.',
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

      // Marca como processado
      await service
        .from('audit_log')
        .update({ acao: 'virais_input_processado' })
        .eq('id', inputRec.id)
    }

    resultados.push({ org: org.nome as string, status: `processados: ${inputs.length}` })
  }

  return NextResponse.json({ ok: true, processados: resultados.length, resultados })
}
