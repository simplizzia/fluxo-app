'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireEquipe, requirePapel } from '@/lib/dal'
import { scanPii } from '@/lib/lgpd/piiScanner'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string
  acao: string
  entidade: string
  entidade_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
  usuario_nome?: string
}

export interface PiiScanEntry {
  id: string
  entidade: string
  entidade_id: string
  tipos_pii_encontrados: string[]
  escaneado_em: string
}

export interface PortabilidadeRequest {
  id: string
  status: string
  file_url: string | null
  observacao: string | null
  created_at: string
  concluido_em: string | null
  solicitado_por_nome?: string
  cliente_nome?: string
}

export interface Encerramento {
  id: string
  cliente_id: string
  motivo: string | null
  anonimizado_em: string | null
  carta_enviada: boolean
  created_at: string
  cliente_nome?: string
  solicitado_por_nome?: string
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function buscarAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('audit_log')
    .select(`
      id, acao, entidade, entidade_id, metadata, ip_address, created_at,
      profiles!usuario_id(nome)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((e) => ({
    ...e,
    metadata: (e.metadata ?? {}) as Record<string, unknown>,
    usuario_nome: (e.profiles as unknown as { nome: string } | null)?.nome,
  })) as AuditLogEntry[]
}

export async function buscarPiiScans(limit = 50): Promise<PiiScanEntry[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('pii_scan_log')
    .select('id, entidade, entidade_id, tipos_pii_encontrados, escaneado_em')
    .order('escaneado_em', { ascending: false })
    .limit(limit)

  return (data ?? []) as PiiScanEntry[]
}

export async function buscarPortabilidadeRequests(): Promise<PortabilidadeRequest[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('lgpd_portabilidade_requests')
    .select(`
      id, status, file_url, observacao, created_at, concluido_em,
      profiles!solicitado_por(nome),
      clientes(nome)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (data ?? []).map((r) => ({
    ...r,
    solicitado_por_nome: (r.profiles as unknown as { nome: string } | null)?.nome,
    cliente_nome: (r.clientes as unknown as { nome: string } | null)?.nome,
  })) as PortabilidadeRequest[]
}

export async function buscarEncerramentos(): Promise<Encerramento[]> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { data } = await supabase
    .from('lgpd_encerramentos')
    .select(`
      id, cliente_id, motivo, anonimizado_em, carta_enviada, created_at,
      clientes(nome),
      profiles!solicitado_por(nome)
    `)
    .order('created_at', { ascending: false })

  return (data ?? []).map((e) => ({
    ...e,
    cliente_nome: (e.clientes as unknown as { nome: string } | null)?.nome,
    solicitado_por_nome: (e.profiles as unknown as { nome: string } | null)?.nome,
  })) as Encerramento[]
}

export async function buscarResumoLgpd() {
  await requirePapel('socia')
  const supabase = await createClient()

  const [
    { count: totalAudit },
    { count: totalPii },
    { count: portabPendente },
    { count: clientesInativos },
  ] = await Promise.all([
    supabase.from('audit_log').select('id', { count: 'exact', head: true }),
    supabase.from('pii_scan_log').select('id', { count: 'exact', head: true }),
    supabase
      .from('lgpd_portabilidade_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente'),
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'inativo'),
  ])

  return {
    totalAudit: totalAudit ?? 0,
    totalPii: totalPii ?? 0,
    portabPendente: portabPendente ?? 0,
    clientesInativos: clientesInativos ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Scan de PII — chamado internamente ao salvar conteúdo
// ---------------------------------------------------------------------------

/**
 * Escaneia texto e persiste resultado em pii_scan_log se encontrar PII.
 * Deve ser chamado via service role (não expõe ao cliente).
 */
export async function actionRegistrarPiiScan(
  entidade: 'card' | 'arquivo' | 'reuniao' | 'proposta' | 'contrato',
  entidadeId: string,
  texto: string,
): Promise<void> {
  const profile = await requireEquipe()
  const service = createServiceClient()

  const { tipos } = scanPii(texto)
  if (tipos.length === 0) return

  await service.from('pii_scan_log').insert({
    organization_id: profile.organization_id,
    entidade,
    entidade_id: entidadeId,
    tipos_pii_encontrados: tipos,
  })
}

// ---------------------------------------------------------------------------
// Portabilidade — cliente exporta seus próprios dados
// ---------------------------------------------------------------------------

/**
 * Gera um JSON com todos os dados do cliente autenticado.
 * Retorna o JSON diretamente (sem Storage, por simplicidade MVP).
 */
export async function actionExportarMeusDados(): Promise<{ json: string; filename: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, papel, organization_id, created_at')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.papel !== 'cliente') {
    throw new Error('Apenas clientes podem usar esta função.')
  }

  // Buscar dados vinculados ao cliente
  const clienteIds: string[] = await supabase
    .from('contatos_cliente')
    .select('cliente_id')
    .eq('user_id', user.id)
    .then(({ data }) => (data ?? []).map((c) => c.cliente_id as string))

  const [{ data: cards }, { data: comentarios }, { data: avaliacoes }] = await Promise.all([
    supabase
      .from('cards')
      .select('id, titulo, status, prioridade, prazo_cliente, created_at')
      .in('cliente_id', clienteIds),
    supabase
      .from('comentarios')
      .select('id, texto, created_at')
      .eq('autor_id', profile.id),
    supabase
      .from('avaliacoes_cliente')
      .select('id, nps, comentario, created_at')
      .in('cliente_id', clienteIds),
  ])

  const exportData = {
    exportado_em: new Date().toISOString(),
    versao: '1.0',
    perfil: {
      nome: profile.nome,
      email: user.email,
      criado_em: profile.created_at,
    },
    demandas: cards ?? [],
    comentarios: comentarios ?? [],
    avaliacoes: avaliacoes ?? [],
  }

  // Registra a solicitação
  await supabase.from('lgpd_portabilidade_requests').insert({
    organization_id: profile.organization_id,
    solicitado_por: profile.id,
    status: 'concluido',
    concluido_em: new Date().toISOString(),
  })

  const filename = `dados-simplizzia-${new Date().toISOString().slice(0, 10)}.json`
  return { json: JSON.stringify(exportData, null, 2), filename }
}

// ---------------------------------------------------------------------------
// Encerramento de contrato (sócia)
// ---------------------------------------------------------------------------

export async function actionEncerrarContrato(
  clienteId: string,
  motivo?: string,
): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  // 1. Marca cliente como inativo
  await service
    .from('clientes')
    .update({ status: 'inativo', updated_at: new Date().toISOString() })
    .eq('id', clienteId)
    .eq('organization_id', profile.organization_id)

  // 2. Revoga acesso de todos os contatos (desativa perfis vinculados)
  const { data: contatos } = await service
    .from('contatos_cliente')
    .select('user_id')
    .eq('cliente_id', clienteId)

  if (contatos && contatos.length > 0) {
    const userIds = contatos.map((c) => c.user_id)
    await service
      .from('profiles')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .in('user_id', userIds)
  }

  // 3. Registra encerramento
  await service.from('lgpd_encerramentos').insert({
    organization_id: profile.organization_id,
    cliente_id: clienteId,
    solicitado_por: profile.id,
    motivo: motivo ?? null,
  })

  // 4. Log de auditoria
  await service.from('audit_log').insert({
    organization_id: profile.organization_id,
    usuario_id: profile.id,
    acao: 'cliente.encerramento_contrato',
    entidade: 'cliente',
    entidade_id: clienteId,
    metadata: { motivo: motivo ?? null },
  })

  revalidatePath('/lgpd')
  revalidatePath('/clientes')
}

// ---------------------------------------------------------------------------
// Anonimização completa (sócia, após período legal)
// ---------------------------------------------------------------------------

export async function actionAnonimizarCliente(
  clienteId: string,
  encerramentoId: string,
): Promise<void> {
  const profile = await requirePapel('socia')
  const service = createServiceClient()

  const placeholder = '[ANONIMIZADO]'

  // Anonimiza campos de identificação do cliente
  await service
    .from('clientes')
    .update({
      nome: placeholder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clienteId)
    .eq('organization_id', profile.organization_id)

  // Anonimiza participantes externos em reuniões
  const { data: reunioes } = await service
    .from('reunioes')
    .select('id')
    .eq('cliente_id', clienteId)

  if (reunioes && reunioes.length > 0) {
    for (const r of reunioes) {
      await service
        .from('reunioes')
        .update({ participantes_externos: [], notas_brutas: placeholder, resumo_gerado: placeholder })
        .eq('id', r.id)
    }
  }

  // Marca encerramento como anonimizado
  await service
    .from('lgpd_encerramentos')
    .update({ anonimizado_em: new Date().toISOString() })
    .eq('id', encerramentoId)

  // Log de auditoria
  await service.from('audit_log').insert({
    organization_id: profile.organization_id,
    usuario_id: profile.id,
    acao: 'cliente.anonimizacao_completa',
    entidade: 'cliente',
    entidade_id: clienteId,
    metadata: { encerramento_id: encerramentoId },
  })

  revalidatePath('/lgpd')
}

// ---------------------------------------------------------------------------
// Helper — registra ação de auditoria (uso interno pelos outros módulos)
// ---------------------------------------------------------------------------

export async function registrarAuditoria(
  organizationId: string,
  usuarioId: string,
  acao: string,
  entidade: string,
  entidadeId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const service = createServiceClient()
  await service.from('audit_log').insert({
    organization_id: organizationId,
    usuario_id: usuarioId,
    acao,
    entidade,
    entidade_id: entidadeId ?? null,
    metadata: (metadata ?? {}) as unknown as import('@/types/database').Json,
  })
}
