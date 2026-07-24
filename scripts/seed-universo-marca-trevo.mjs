/**
 * Popula universo_marca com os documentos estratégicos já produzidos em
 * clientes/trevo/*.md, escopados à marca "Trevo" (produtos) e "Trevo Lácteos
 * | Ehrmann" (institucional) — para que os agentes (planejamento.calendario,
 * criativo.*, etc.) tenham contexto real ao rodar com marca_id escopado.
 *
 * Busca o cliente e as marcas por nome em runtime (não crava UUIDs) —
 * idempotente via upsert por organization_id + cliente_id + marca_id +
 * subcategoria, mesmo padrão de seed-universo-marca-bantukatu.mjs.
 *
 * Pré-requisito: scripts/fix-hierarquia-marcas-trevo.mjs já ter rodado
 * (marcas "Trevo" e "Trevo Lácteos | Ehrmann" precisam existir com nivel='mae').
 *
 * Uso: node scripts/seed-universo-marca-trevo.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const env = {}
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  } catch {}
  return env
}

const env = { ...loadEnv(), ...process.env }
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1. Localiza cliente
const { data: cliente, error: errCliente } = await supabase
  .from('clientes')
  .select('id, organization_id')
  .ilike('nome', '%Trevo%')
  .maybeSingle()
if (errCliente || !cliente) {
  console.log('ERRO: cliente Trevo não encontrado.', errCliente?.message ?? '')
  process.exit(1)
}
const ORGANIZATION_ID = cliente.organization_id
const CLIENTE_ID = cliente.id

// 2. Localiza marcas "Trevo" e "Trevo Lácteos | Ehrmann" (institucional)
const { data: onb } = await supabase.from('onboarding_clientes').select('token').eq('cliente_id', CLIENTE_ID).maybeSingle()
const { data: marcas } = await supabase.from('onboarding_marcas').select('id, nome').eq('token', onb.token)

const marcaTrevo = marcas?.find((m) => m.nome.trim().toLowerCase() === 'trevo')
const marcaInstitucional = marcas?.find((m) => m.nome.trim().toLowerCase() === 'trevo lácteos | ehrmann')

if (!marcaTrevo) {
  console.log('ERRO: marca "Trevo" não encontrada. Rode scripts/fix-hierarquia-marcas-trevo.mjs primeiro.')
  process.exit(1)
}

const DOCS_DIR = resolve(process.cwd(), 'clientes/trevo')

const registros = [
  {
    marcaId: marcaTrevo.id,
    arquivo: 'perfil-criadores-gifting_2026-07-14/perfil-criadores-gifting-trevo.md',
    categoria: 'personas',
    subcategoria: 'perfil_criadores',
    titulo: 'Perfil de Criadores & Gifting — Trevo',
  },
  {
    marcaId: marcaTrevo.id,
    arquivo: 'roteiro-jul-dez-2026_2026-07-06/01-roteiro-semestral-jul-dez-2026.md',
    categoria: 'calendario',
    subcategoria: 'roteiro_semestral',
    titulo: 'Roteiro Semestral Jul-Dez 2026 — Trevo',
  },
  {
    marcaId: marcaTrevo.id,
    arquivo: 'roteiro-jul-dez-2026_2026-07-06/05-diagnostico-trafego-e-site.md',
    categoria: 'diagnostico',
    subcategoria: 'trafego_site',
    titulo: 'Diagnóstico de Tráfego e Site — Trevo',
  },
  {
    marcaId: marcaTrevo.id,
    arquivo: 'estrategia-trafego-pago_2026-07-14/01-estrategia-trafego-pago.md',
    categoria: 'parametros',
    subcategoria: 'estrategia_trafego',
    titulo: 'Estratégia de Tráfego Pago — Trevo',
  },
  {
    marcaId: marcaTrevo.id,
    arquivo: 'roadmap-jul-dez-2026_2026-07-07/04-versao-final.md',
    categoria: 'brand_system',
    subcategoria: 'roadmap',
    titulo: 'Roadmap Estratégico Jul-Dez 2026 — Trevo',
  },
]

if (marcaInstitucional) {
  registros.push({
    marcaId: marcaInstitucional.id,
    arquivo: '../trevo/comunicacao-interna-linkedin_2026-06-24/04-versao-final.md',
    categoria: 'brand_system',
    subcategoria: 'comunicacao_interna',
    titulo: 'Comunicação Interna (LinkedIn) — Institucional',
  })
} else {
  console.log('AVISO: marca institucional "Trevo Lácteos | Ehrmann" não encontrada — pulando doc de comunicação interna.')
}

for (const reg of registros) {
  const texto = readFileSync(resolve(DOCS_DIR, reg.arquivo), 'utf-8')

  const { data: existente } = await supabase
    .from('universo_marca')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('cliente_id', CLIENTE_ID)
    .eq('marca_id', reg.marcaId)
    .eq('subcategoria', reg.subcategoria)
    .maybeSingle()

  const payload = {
    organization_id: ORGANIZATION_ID,
    cliente_id: CLIENTE_ID,
    marca_id: reg.marcaId,
    categoria: reg.categoria,
    subcategoria: reg.subcategoria,
    titulo: reg.titulo,
    conteudo: { texto },
    visivel_para_cliente: false,
    gerado_por_agente: null,
  }

  if (existente) {
    const { error } = await supabase.from('universo_marca').update(payload).eq('id', existente.id)
    console.log(error ? `ERRO update ${reg.subcategoria}: ${error.message}` : `OK update ${reg.subcategoria} (${texto.length} chars)`)
  } else {
    const { error } = await supabase.from('universo_marca').insert(payload)
    console.log(error ? `ERRO insert ${reg.subcategoria}: ${error.message}` : `OK insert ${reg.subcategoria} (${texto.length} chars)`)
  }
}

// Sub-marca sem conteúdo próprio ainda — nota informativa, não cria registro vazio
console.log('\nAVISO: "Trevo Kids" não tem documento próprio ainda — herdará contexto de "Trevo" via buildContextoCliente.')

// Neutraliza o briefing_completo pré-existente (marca_id NULL, mistura as 3 marcas)
const TEXTO_NEUTRALIZADO = `> **Nota (2026-07-16):** este briefing geral foi SUPERADO por documentos escopados por marca (ver Universo de Marca de Trevo, Ehrmann e Institucional individualmente). Mantido só como histórico — não usar como contexto ativo (já excluído da injeção automática em executor.ts).`

const { error: errBriefing } = await supabase
  .from('universo_marca')
  .update({ conteudo: { texto: TEXTO_NEUTRALIZADO } })
  .eq('organization_id', ORGANIZATION_ID)
  .eq('cliente_id', CLIENTE_ID)
  .eq('subcategoria', 'briefing_completo')

console.log(errBriefing ? `ERRO neutralizar briefing_completo: ${errBriefing.message}` : 'OK neutralizado briefing_completo (stale)')
