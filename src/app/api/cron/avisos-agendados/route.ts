/**
 * Cron: avisos-agendados
 *
 * Roda a cada 30 minutos.
 * Busca avisos_equipe com agendado_para <= now() e publicado_em IS NULL.
 * Para cada um: insere notificações in-app e envia e-mails.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buscarEmailUsuario, enviarEmail, emailAviso } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const agora = new Date().toISOString()

  try {
    // Buscar avisos agendados prontos para publicar
    const { data: avisos } = await service
      .from('avisos_equipe')
      .select('id, organization_id, titulo, conteudo, link_url, destinatarios, parceiro_ids')
      .lte('agendado_para', agora)
      .is('publicado_em', null)

    if (!avisos?.length) {
      return NextResponse.json({ ok: true, publicados: 0 })
    }

    let publicados = 0

    for (const aviso of avisos) {
      // 1. Marcar como publicado
      await service
        .from('avisos_equipe')
        .update({ publicado_em: agora })
        .eq('id', aviso.id)

      // 2. Buscar destinatários
      const typedAviso = aviso as {
        id: string
        organization_id: string
        titulo: string
        conteudo: string
        link_url: string | null
        destinatarios: 'todos' | 'ativos' | 'especificos'
        parceiro_ids: string[] | null
      }

      let perfilQuery = service
        .from('profiles')
        .select('id, user_id, nome')
        .eq('organization_id', typedAviso.organization_id)
        .not('papel', 'eq', 'cliente')

      if (typedAviso.destinatarios === 'ativos') {
        const { data: colabs } = await service
          .from('colaboradores_mapa')
          .select('user_id')
          .eq('organization_id', typedAviso.organization_id)
          .eq('status', 'ativo')
        const userIds = (colabs ?? []).map((c) => c.user_id)
        if (userIds.length) perfilQuery = perfilQuery.in('user_id', userIds)
      } else if (typedAviso.destinatarios === 'especificos' && typedAviso.parceiro_ids?.length) {
        perfilQuery = perfilQuery.in('id', typedAviso.parceiro_ids)
      }

      const { data: perfis } = await perfilQuery

      if (!perfis?.length) continue

      // 3. Notificações in-app
      const notificacoes = perfis.map((p) => ({
        organization_id: typedAviso.organization_id,
        usuario_id: (p as { id: string }).id,
        tipo: 'geral' as const,
        titulo: typedAviso.titulo,
        mensagem: typedAviso.conteudo.slice(0, 200),
        link: `/socias/pessoas?aviso=${typedAviso.id}`,
      }))
      await service.from('in_app_notificacoes').insert(notificacoes)

      // 4. E-mails (best-effort)
      for (const p of perfis) {
        const typedP = p as { id: string; user_id: string; nome: string }
        const emailAddr = await buscarEmailUsuario(typedP.user_id)
        if (!emailAddr) continue
        const { subject, html } = emailAviso({
          destinatarioNome: typedP.nome,
          titulo: typedAviso.titulo,
          conteudo: typedAviso.conteudo,
          linkUrl: typedAviso.link_url,
        })
        await enviarEmail(emailAddr, subject, html)
      }

      publicados++
    }

    return NextResponse.json({ ok: true, publicados })
  } catch (err) {
    console.error('[cron/avisos-agendados]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
