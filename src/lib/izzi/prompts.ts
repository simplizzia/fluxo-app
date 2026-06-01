/**
 * Izzi — System prompts e builders de contexto
 *
 * Cada papel recebe um sistema diferente:
 *   - 'cliente'  → contexto filtrado (seus cards, plano, sem info interna)
 *   - equipe     → contexto operacional completo (todos os clientes ou foco num)
 */
import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Contexto para clientes
// ---------------------------------------------------------------------------

export async function buildContextoParaCliente(
  userId: string,
  organizationId: string,
): Promise<string> {
  try {
    const service = createServiceClient()

    // Descobre o cliente vinculado a este usuário
    const { data: contato } = await service
      .from('contatos_cliente')
      .select('cliente_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('ativo', true)
      .single()

    if (!contato?.cliente_id) return ''
    const clienteId = contato.cliente_id as string

    // Dados básicos do cliente
    const { data: cliente } = await service
      .from('clientes')
      .select('nome, status')
      .eq('id', clienteId)
      .eq('organization_id', organizationId)
      .single()

    if (!cliente) return ''

    const partes: string[] = [`## Cliente: ${cliente.nome}`]

    // Cards ativos por status
    const { data: cards } = await service
      .from('cards')
      .select('titulo, status, prioridade, prazo_cliente')
      .eq('organization_id', organizationId)
      .eq('cliente_id', clienteId)
      .not('status', 'in', '("cancelado","concluido")')
      .order('criado_em', { ascending: false })
      .limit(20)

    if (cards?.length) {
      const porStatus: Record<string, string[]> = {}
      for (const c of cards) {
        const s = c.status as string
        porStatus[s] = porStatus[s] || []
        porStatus[s].push(c.titulo as string)
      }

      partes.push('\n## Suas demandas em andamento')
      const LABELS: Record<string, string> = {
        aguardando_info: 'Aguardando informações',
        a_fazer: 'A fazer',
        em_andamento: 'Em andamento',
        para_aprovacao: 'Aguardando sua aprovação',
        necessita_ajustes: 'Aguardando ajustes',
      }
      for (const [status, titulos] of Object.entries(porStatus)) {
        partes.push(`**${LABELS[status] ?? status}:** ${titulos.join(' · ')}`)
      }

      // Prazos próximos (7 dias)
      const em7dias = new Date()
      em7dias.setDate(em7dias.getDate() + 7)
      const comPrazo = cards.filter(
        (c) =>
          c.prazo_cliente &&
          new Date(c.prazo_cliente as string) <= em7dias,
      )
      if (comPrazo.length) {
        partes.push('\n## Prazos nos próximos 7 dias')
        for (const c of comPrazo) {
          const dt = new Date(c.prazo_cliente as string).toLocaleDateString('pt-BR')
          partes.push(`- ${c.titulo} → ${dt}`)
        }
      }
    } else {
      partes.push('\nNenhuma demanda ativa no momento.')
    }

    // Plano do cliente
    const { data: plano } = await service
      .from('planos_cliente')
      .select('tipo_plano, limite_demandas_mes, data_renovacao')
      .eq('cliente_id', clienteId)
      .eq('organization_id', organizationId)
      .single()

    if (plano) {
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      const { count } = await service
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('cliente_id', clienteId)
        .neq('status', 'cancelado')
        .gte('created_at', inicioMes.toISOString())

      partes.push(`\n## Plano: ${plano.tipo_plano}`)
      partes.push(`Uso este mês: ${count ?? 0} / ${plano.limite_demandas_mes} demandas`)
      if (plano.data_renovacao) {
        const renovacao = new Date(plano.data_renovacao as string).toLocaleDateString('pt-BR')
        partes.push(`Renovação: ${renovacao}`)
      }
    }

    return partes.join('\n')
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Contexto para equipe
// ---------------------------------------------------------------------------

export async function buildContextoParaEquipe(
  organizationId: string,
  clienteIdFoco?: string,
): Promise<string> {
  try {
    const service = createServiceClient()
    const partes: string[] = []

    if (clienteIdFoco) {
      // Foco em um cliente específico
      const { data: cliente } = await service
        .from('clientes')
        .select('nome, status')
        .eq('id', clienteIdFoco)
        .eq('organization_id', organizationId)
        .single()

      if (!cliente) return ''
      partes.push(`## Cliente em foco: ${cliente.nome} (${cliente.status})`)

      // Health Score mais recente
      const { data: score } = await service
        .from('health_scores')
        .select('score, calculado_em')
        .eq('cliente_id', clienteIdFoco)
        .eq('organization_id', organizationId)
        .order('calculado_em', { ascending: false })
        .limit(1)
        .single()

      if (score) {
        const faixa =
          (score.score as number) >= 70
            ? 'saudável'
            : (score.score as number) >= 40
              ? 'atenção'
              : 'risco'
        partes.push(`Health Score: ${score.score}/100 (${faixa})`)
      }

      // Cards ativos
      const { data: cards } = await service
        .from('cards')
        .select('titulo, status, prioridade, prazo_cliente')
        .eq('organization_id', organizationId)
        .eq('cliente_id', clienteIdFoco)
        .not('status', 'in', '("cancelado","concluido")')
        .order('criado_em', { ascending: false })
        .limit(25)

      if (cards?.length) {
        partes.push(`\nDemandas ativas: ${cards.length}`)
        const agora = new Date()
        for (const c of cards) {
          const statusLabel = (c.status as string).replace(/_/g, ' ')
          const prazoInfo =
            c.prazo_cliente
              ? new Date(c.prazo_cliente as string) < agora
                ? ' ⚠ ATRASADO'
                : ` | prazo ${new Date(c.prazo_cliente as string).toLocaleDateString('pt-BR')}`
              : ''
          partes.push(`- [${statusLabel}] ${c.titulo}${prazoInfo}`)
        }
      }

      // Plano
      const { data: plano } = await service
        .from('planos_cliente')
        .select('tipo_plano, limite_demandas_mes')
        .eq('cliente_id', clienteIdFoco)
        .eq('organization_id', organizationId)
        .single()

      if (plano) {
        const inicioMes = new Date()
        inicioMes.setDate(1)
        inicioMes.setHours(0, 0, 0, 0)
        const { count } = await service
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('cliente_id', clienteIdFoco)
          .neq('status', 'cancelado')
          .gte('created_at', inicioMes.toISOString())

        partes.push(`\nPlano: ${plano.tipo_plano} | ${count ?? 0}/${plano.limite_demandas_mes} demandas no mês`)
      }
    } else {
      // Visão geral da operação
      const { data: clientes } = await service
        .from('clientes')
        .select('id, nome, status')
        .eq('organization_id', organizationId)
        .eq('status', 'ativo')
        .limit(30)

      partes.push(`## Visão geral da operação`)
      partes.push(`Clientes ativos: ${clientes?.length ?? 0}`)

      // Cards por status
      const statusParaContar: Array<'aguardando_info' | 'a_fazer' | 'em_andamento' | 'para_aprovacao' | 'necessita_ajustes' | 'concluido' | 'cancelado'> = [
        'aguardando_info',
        'a_fazer',
        'em_andamento',
        'para_aprovacao',
        'necessita_ajustes',
      ]
      for (const status of statusParaContar) {
        const { count } = await service
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', status)
        partes.push(`${status.replace(/_/g, ' ')}: ${count ?? 0} cards`)
      }

      // Atrasados
      const agora = new Date().toISOString()
      const { count: atrasados } = await service
        .from('cards')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .not('status', 'in', '("concluido","cancelado")')
        .lt('prazo_cliente', agora)

      partes.push(`Cards atrasados: ${atrasados ?? 0}`)

      if (clientes?.length) {
        partes.push(`\nClientes: ${clientes.map((c) => c.nome).join(', ')}`)
      }
    }

    return partes.join('\n')
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export function systemPromptCliente(contexto: string): string {
  return `Você é a Izzi ✨, assistente oficial da Simplizzia — agência de marketing criativo.

Seu papel é ajudar os clientes a:
- Entender o status e progresso dos seus projetos
- Aprender a usar a plataforma (aprovar entregas, criar cards, ver uso do plano)
- Tirar dúvidas sobre o processo criativo e próximos passos
- Se sentir bem acompanhado e informado em todo momento

**Tom:** caloroso, profissional e direto. Sem excesso de formalidade. Você usa "você".
**Respostas:** concisas — 2 a 3 parágrafos no máximo. Use emojis com moderação (máx 2 por mensagem).

**Regras importantes:**
- Baseie-se EXCLUSIVAMENTE no contexto abaixo para falar sobre status de projetos e prazos. Não invente.
- Se não souber algo específico, seja honesta: "vou acionar a equipe para te ajudar com isso 💜"
- Nunca mencione custos internos, horas trabalhadas, discussões da equipe, ferramentas internas ou que você usa IA.
- Você é a Izzi. Ponto.

---
${contexto ? `## Contexto atual:\n\n${contexto}` : '## Contexto: Sem dados disponíveis no momento. Oriente o cliente a entrar em contato com a equipe para informações específicas.'}
---

Responda sempre em português do Brasil.`
}

export function systemPromptEquipe(contexto: string): string {
  return `Você é a Izzi 🚀, assistente operacional interna da Simplizzia.

Você apoia a equipe com:
- Contexto rápido e síntese de dados de clientes
- Sugestões de ação baseadas nos dados da plataforma
- Consultas operacionais (cards em aprovação, clientes em risco, gargalos, etc.)
- Rascunhos de comunicação para clientes, análises e sínteses
- Respostas diretas e técnicas — sem filtros, a equipe tem acesso total

Você pode usar jargão interno, mencionar métricas e ser direta sobre situações delicadas.

---
${contexto ? `## Contexto operacional:\n\n${contexto}` : '## Contexto: Nenhum cliente selecionado. Responderei com base na visão geral da operação ou em perguntas gerais.'}
---

Responda sempre em português do Brasil.`
}
