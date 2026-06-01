'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePapel } from '@/lib/dal'
import { buscarEmailsResponsaveis, enviarEmail } from '@/lib/email'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RelatorioResumo {
  id: string
  clienteId: string
  clienteNome: string
  mesReferencia: string   // "2026-04-01"
  status: 'gerando' | 'rascunho' | 'aprovado' | 'enviado'
  enviadoEm: string | null
  criadoEm: string
}

export interface RelatorioDetalhe extends RelatorioResumo {
  dados: Record<string, unknown>
  conteudo: string | null
  conteudoEditado: string | null
}

// ---------------------------------------------------------------------------
// buscarRelatorios — listagem para a sócia/atendimento
// ---------------------------------------------------------------------------

export async function buscarRelatorios(mesReferencia?: string): Promise<{
  relatorios?: RelatorioResumo[]
  error?: string
}> {
  await requirePapel('socia', 'atendimento')
  const supabase = await createClient()

  let query = supabase
    .from('relatorios_cliente')
    .select('id, cliente_id, status, enviado_em, created_at, mes_referencia, clientes(nome)')
    .order('mes_referencia', { ascending: false })
    .order('created_at', { ascending: false })

  if (mesReferencia) {
    query = query.eq('mes_referencia', mesReferencia)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  const relatorios: RelatorioResumo[] = (data ?? []).map((r) => ({
    id: r.id as string,
    clienteId: r.cliente_id as string,
    clienteNome: (r.clientes as unknown as { nome: string } | null)?.nome ?? 'Cliente',
    mesReferencia: r.mes_referencia as string,
    status: r.status as RelatorioResumo['status'],
    enviadoEm: r.enviado_em as string | null,
    criadoEm: r.created_at as string,
  }))

  return { relatorios }
}

// ---------------------------------------------------------------------------
// buscarRelatorio — detalhe de um relatório
// ---------------------------------------------------------------------------

export async function buscarRelatorio(id: string): Promise<{
  relatorio?: RelatorioDetalhe
  error?: string
}> {
  // Cliente também pode acessar — RLS garante que só vê relatórios 'enviado'
  // ligados ao seu contatos_cliente. Equipe vê todos os status.
  await requirePapel('socia', 'atendimento', 'cliente')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('relatorios_cliente')
    .select('*, clientes(nome)')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  if (!data) return { error: 'Relatório não encontrado.' }

  return {
    relatorio: {
      id: data.id as string,
      clienteId: data.cliente_id as string,
      clienteNome: (data.clientes as unknown as { nome: string } | null)?.nome ?? 'Cliente',
      mesReferencia: data.mes_referencia as string,
      status: data.status as RelatorioResumo['status'],
      enviadoEm: data.enviado_em as string | null,
      criadoEm: data.created_at as string,
      dados: (data.dados ?? {}) as Record<string, unknown>,
      conteudo: data.conteudo as string | null,
      conteudoEditado: data.conteudo_editado as string | null,
    },
  }
}

// ---------------------------------------------------------------------------
// buscarRelatoriosCliente — portal do cliente (só enviados)
// ---------------------------------------------------------------------------

export async function buscarRelatoriosCliente(): Promise<{
  relatorios?: RelatorioResumo[]
  error?: string
}> {
  await requirePapel('cliente')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('relatorios_cliente')
    .select('id, cliente_id, status, enviado_em, created_at, mes_referencia')
    .eq('status', 'enviado')
    .order('mes_referencia', { ascending: false })

  if (error) return { error: error.message }

  const relatorios: RelatorioResumo[] = (data ?? []).map((r) => ({
    id: r.id as string,
    clienteId: r.cliente_id as string,
    clienteNome: '',
    mesReferencia: r.mes_referencia as string,
    status: r.status as RelatorioResumo['status'],
    enviadoEm: r.enviado_em as string | null,
    criadoEm: r.created_at as string,
  }))

  return { relatorios }
}

// ---------------------------------------------------------------------------
// actionSalvarRascunho — sócia edita o conteúdo
// ---------------------------------------------------------------------------

export async function actionSalvarRascunho(
  id: string,
  conteudoEditado: string,
): Promise<{ ok: boolean; error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('relatorios_cliente')
    .update({
      conteudo_editado: conteudoEditado,
      status: 'rascunho',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// actionAprovarRelatorio — marca como aprovado (pronto para enviar)
// ---------------------------------------------------------------------------

export async function actionAprovarRelatorio(id: string): Promise<{ ok: boolean; error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  const { error } = await supabase
    .from('relatorios_cliente')
    .update({ status: 'aprovado', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// actionEnviarRelatorio — envia por email e marca como enviado
// ---------------------------------------------------------------------------

export async function actionEnviarRelatorio(id: string): Promise<{ ok: boolean; error?: string }> {
  await requirePapel('socia')
  const supabase = await createClient()

  // Busca o relatório
  const { data: rel } = await supabase
    .from('relatorios_cliente')
    .select('*, clientes(nome)')
    .eq('id', id)
    .single()

  if (!rel) return { ok: false, error: 'Relatório não encontrado.' }
  if (rel.status === 'enviado') return { ok: false, error: 'Relatório já foi enviado.' }

  const clienteNome = (rel.clientes as unknown as { nome: string } | null)?.nome ?? 'Cliente'
  const conteudo = (rel.conteudo_editado as string | null) ?? (rel.conteudo as string | null) ?? ''
  const mesRef = new Date(rel.mes_referencia as string)
  const nomeMes = mesRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Busca emails dos responsáveis
  const emails = await buscarEmailsResponsaveis(rel.cliente_id as string, rel.organization_id as string)

  if (!emails.length) {
    return { ok: false, error: 'Nenhum contato responsável encontrado para este cliente.' }
  }

  // Envia o email
  await enviarEmail(
    emails,
    `Relatório ${nomeMes} — ${clienteNome}`,
    emailRelatorio({ clienteNome, nomeMes, conteudo, relatorioId: id }),
  )

  // Marca como enviado
  await supabase
    .from('relatorios_cliente')
    .update({
      status: 'enviado',
      enviado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// actionGerarRelatorioManual — sócia regenera ou gera manualmente
// ---------------------------------------------------------------------------

export async function actionGerarRelatorioManual(
  clienteId: string,
  mesReferencia: string,
): Promise<{ ok: boolean; relatorioId?: string; error?: string }> {
  await requirePapel('socia')

  // Delega para o cron endpoint localmente via fetch interno
  // Na prática, isso pode ser feito direto aqui também
  // Por simplicidade, redireciona para a listagem após gerar
  return { ok: false, error: 'Use o cron automático ou aguarde a próxima execução.' }
}

// ---------------------------------------------------------------------------
// Template de email — relatório mensal
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function emailRelatorio(opts: {
  clienteNome: string
  nomeMes: string
  conteudo: string
  relatorioId: string
}): string {
  // Converte markdown básico para HTML para o email
  const htmlConteudo = markdownParaHtml(opts.conteudo)

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr>
        <td style="background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);border-radius:16px 16px 0 0;padding:20px 32px">
          <table width="100%"><tr>
            <td><span style="font-size:18px;font-weight:700;color:#fff">Simplizzia</span></td>
            <td align="right"><span style="font-size:11px;color:rgba(255,255,255,.75)">por Izzi</span></td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:32px;border-radius:0 0 16px 16px">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#A046C6;text-transform:uppercase;letter-spacing:.05em">Relatório Mensal</p>
          <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1E1E1E">${opts.nomeMes}</p>
          <div style="font-size:14px;color:#374151;line-height:1.7">
            ${htmlConteudo}
          </div>
          <div style="margin-top:32px;padding:20px;background:#F9FAFB;border-radius:12px;text-align:center">
            <p style="margin:0 0 12px;font-size:13px;color:#6B7280">Acesse a plataforma para ver o relatório completo e histórico.</p>
            <a href="${APP_URL}/relatorios/${opts.relatorioId}" style="display:inline-block;background:linear-gradient(135deg,#A046C6 0%,#F9267C 100%);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:12px">Ver relatório completo →</a>
          </div>
          <hr style="border:none;border-top:1px solid #F4F4F4;margin:28px 0 20px">
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center">
            Izzi · Assistente da Simplizzia ·
            <a href="${APP_URL}" style="color:#A046C6;text-decoration:none">app.simplizzia.com.br</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table></body></html>`
}

/** Conversão mínima de markdown para HTML inline (para email) */
function markdownParaHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h3 style="margin:24px 0 8px;font-size:15px;font-weight:700;color:#1E1E1E">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:20px 0 6px;font-size:14px;font-weight:600;color:#374151">$1</h4>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 12px">')
    .replace(/^(?!<[hlip])(.+)$/gm, '<p style="margin:0 0 12px">$1</p>')
}
