import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * buildContextoOnboarding — substitui getClientContext() do Notion.
 *
 * Busca dados do prospect e do cliente no fluxo-app para injetar
 * no system prompt da Izzi como contexto pré-reunião.
 */
export async function buildContextoOnboarding(
  clienteId: string,
  contextExtra?: string | null,
): Promise<string> {
  const service = createServiceClient()

  const partes: string[] = []

  // 1. Dados básicos do cliente
  const { data: cliente } = await service
    .from('clientes')
    .select('nome, status')
    .eq('id', clienteId)
    .single()

  if (cliente) {
    partes.push(`## Cliente\nNome: ${cliente.nome}`)
  }

  // 2. Dados do prospect (CRM) — notas, segmento, valor, origem
  const { data: prospect } = await service
    .from('prospects')
    .select('nome, empresa, segmento, contato, valor_mensal_proposto, origem')
    .eq('cliente_id', clienteId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (prospect) {
    if (prospect.empresa) partes.push(`Empresa: ${prospect.empresa}`)
    if (prospect.segmento) partes.push(`Segmento: ${prospect.segmento}`)
    if (prospect.valor_mensal_proposto) {
      partes.push(`Investimento mensal: R$ ${Number(prospect.valor_mensal_proposto).toLocaleString('pt-BR')}`)
    }

    // Contato: extrai email/telefone do JSONB
    const contato = prospect.contato as Record<string, string> | null
    if (contato?.email) partes.push(`Email: ${contato.email}`)
    if (contato?.linkedin) partes.push(`LinkedIn: ${contato.linkedin}`)
  }

  // 3. Notas internas do CRM (interações registradas)
  const { data: interacoes } = await service
    .from('interacoes_prospect')
    .select('tipo, descricao, created_at')
    .eq('organization_id', (await service.from('clientes').select('organization_id').eq('id', clienteId).single()).data?.organization_id ?? '')
    .order('created_at', { ascending: false })
    .limit(5)

  if (interacoes && interacoes.length > 0) {
    partes.push('\n## Histórico de interações')
    interacoes.forEach((i) => {
      partes.push(`- [${i.tipo}] ${i.descricao}`)
    })
  }

  // 4. Contexto extra salvo no token (campo livre preenchido pela sócia ao criar a sessão)
  if (contextExtra?.trim()) {
    partes.push(`\n## Notas adicionais da equipe\n${contextExtra}`)
  }

  return partes.join('\n')
}
