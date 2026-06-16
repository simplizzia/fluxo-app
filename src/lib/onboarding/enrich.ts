import 'server-only'
import { createServiceClient } from '@/lib/supabase/server'

const GRAPH_URL = 'https://graph.facebook.com/v22.0'

// ---------------------------------------------------------------------------
// fetchSiteContent — extrai texto do site da marca para diagnóstico
// ---------------------------------------------------------------------------

export async function fetchSiteContent(url: string): Promise<string> {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    const res = await fetch(normalizedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        // Simula browser para evitar bloqueios básicos de bot detection
        'User-Agent': 'Mozilla/5.0 (compatible; SimplizziaBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!res.ok) {
      return `(site retornou status ${res.status} — conteúdo não disponível)`
    }

    const html = await res.text()

    // Extrai meta description e title (mais confiáveis em SPAs)
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ?? ''

    // Remove scripts, estilos, comentários e tags HTML
    const texto = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // Monta saída priorizando meta tags e primeiros 5.000 chars do texto
    const partes: string[] = []
    if (title)    partes.push(`Título: ${title}`)
    if (metaDesc) partes.push(`Meta description: ${metaDesc}`)
    if (texto)    partes.push(`Conteúdo do site:\n${texto.slice(0, 5000)}`)

    return partes.length > 0
      ? partes.join('\n\n')
      : '(site acessado mas sem conteúdo extraível — pode ser SPA ou site protegido)'
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `(site inacessível: ${msg})`
  }
}

// ---------------------------------------------------------------------------
// fetchInstagramData — métricas da conta Instagram via integração existente
// ---------------------------------------------------------------------------

export async function fetchInstagramData(
  clienteId: string,
  organizationId: string,
): Promise<string> {
  try {
    const service = createServiceClient()

    // Busca integração Instagram ativa: primeiro tenta nível cliente, depois org
    const { data: integracoes } = await service
      .from('integracao_social')
      .select('id, page_id, page_nome, access_token')
      .eq('organization_id', organizationId)
      .eq('plataforma', 'instagram')
      .eq('ativo', true)

    const integracao =
      integracoes?.find((i) => i.page_id) ?? null

    if (!integracao) {
      return '(Instagram não conectado — diagnóstico baseado em análise qualitativa do handle)'
    }

    const linhas: string[] = [`Conta conectada: ${integracao.page_nome ?? integracao.page_id}`]

    // Tenta buscar follower_count e media_count via Graph API
    try {
      const profileRes = await fetch(
        `${GRAPH_URL}/${integracao.page_id}?fields=followers_count,media_count,biography,website&access_token=${integracao.access_token}`,
        { signal: AbortSignal.timeout(6000) },
      )
      if (profileRes.ok) {
        const profile = await profileRes.json() as {
          followers_count?: number
          media_count?: number
          biography?: string
          website?: string
        }
        if (profile.followers_count != null) linhas.push(`Seguidores: ${profile.followers_count.toLocaleString('pt-BR')}`)
        if (profile.media_count != null)     linhas.push(`Total de posts: ${profile.media_count}`)
        if (profile.biography)               linhas.push(`Bio: ${profile.biography}`)
        if (profile.website)                 linhas.push(`Site na bio: ${profile.website}`)
      }
    } catch {
      // Falha na API não bloqueia — continua com métricas do banco
    }

    // Busca métricas dos últimos 30 dias via banco
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - 30)

    const { data: metricas } = await service
      .from('metricas_sociais')
      .select(`
        alcance, impressoes, curtidas, comentarios,
        compartilhamentos, salvamentos, taxa_engajamento,
        publicacoes_agendadas!inner(tipo_conteudo, publicado_em)
      `)
      .eq('publicacoes_agendadas.integracao_id', integracao.id)
      .gte('coletado_em', dataLimite.toISOString())
      .order('coletado_em', { ascending: false })

    if (!metricas || metricas.length === 0) {
      linhas.push('Métricas dos últimos 30 dias: sem dados disponíveis no sistema')
      return linhas.join('\n')
    }

    linhas.push(`\nMétricas dos últimos 30 dias (${metricas.length} post${metricas.length > 1 ? 's' : ''} analisado${metricas.length > 1 ? 's' : ''}):`)

    // Calcula médias
    const soma = metricas.reduce(
      (acc, m) => ({
        alcance: acc.alcance + (m.alcance ?? 0),
        impressoes: acc.impressoes + (m.impressoes ?? 0),
        curtidas: acc.curtidas + (m.curtidas ?? 0),
        comentarios: acc.comentarios + (m.comentarios ?? 0),
        compartilhamentos: acc.compartilhamentos + (m.compartilhamentos ?? 0),
        salvamentos: acc.salvamentos + (m.salvamentos ?? 0),
        taxa: acc.taxa + (Number(m.taxa_engajamento) ?? 0),
      }),
      { alcance: 0, impressoes: 0, curtidas: 0, comentarios: 0, compartilhamentos: 0, salvamentos: 0, taxa: 0 },
    )
    const n = metricas.length
    const fmt = (v: number) => Math.round(v / n).toLocaleString('pt-BR')

    linhas.push(`Alcance médio: ${fmt(soma.alcance)}`)
    linhas.push(`Impressões médias: ${fmt(soma.impressoes)}`)
    linhas.push(`Taxa de engajamento média: ${((soma.taxa / n) * 100).toFixed(1)}%`)
    linhas.push(`Curtidas médias: ${fmt(soma.curtidas)}`)
    linhas.push(`Comentários médios: ${fmt(soma.comentarios)}`)
    linhas.push(`Salvamentos médios: ${fmt(soma.salvamentos)}`)

    // Tipo de conteúdo com melhor engajamento
    const porTipo: Record<string, { count: number; taxaTotal: number }> = {}
    for (const m of metricas) {
      const pub = (m as { publicacoes_agendadas?: { tipo_conteudo?: string } }).publicacoes_agendadas
      const tipo = pub?.tipo_conteudo ?? 'outros'
      if (!porTipo[tipo]) porTipo[tipo] = { count: 0, taxaTotal: 0 }
      porTipo[tipo].count++
      porTipo[tipo].taxaTotal += Number(m.taxa_engajamento) ?? 0
    }
    const melhorTipo = Object.entries(porTipo)
      .map(([tipo, d]) => ({ tipo, media: d.taxaTotal / d.count }))
      .sort((a, b) => b.media - a.media)[0]
    if (melhorTipo) {
      linhas.push(`Tipo de conteúdo com maior engajamento: ${melhorTipo.tipo} (${(melhorTipo.media * 100).toFixed(1)}% de taxa média)`)
    }

    return linhas.join('\n')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `(erro ao buscar dados de Instagram: ${msg})`
  }
}
