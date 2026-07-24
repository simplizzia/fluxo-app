/**
 * Popula universo_marca com os documentos estratégicos já produzidos em
 * clientes/ehrmann/*.md, escopados à marca "Ehrmann" (produtos) — para que
 * os agentes tenham contexto real ao rodar com marca_id escopado.
 *
 * Busca o cliente e a marca por nome em runtime (não crava UUIDs) —
 * idempotente via upsert por organization_id + cliente_id + marca_id +
 * subcategoria, mesmo padrão de seed-universo-marca-bantukatu.mjs.
 *
 * Pré-requisito: scripts/fix-hierarquia-marcas-trevo.mjs já ter rodado
 * (marca "Ehrmann" precisa existir com nivel='mae').
 *
 * A neutralização do briefing_completo (nível-cliente, compartilhado com
 * Trevo) já é feita por scripts/seed-universo-marca-trevo.mjs — não repetida
 * aqui para não duplicar responsabilidade entre os dois scripts.
 *
 * Uso: node scripts/seed-universo-marca-ehrmann.mjs
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

// 1. Localiza cliente (mesmo cliente "Trevo Lácteos | Ehrmann" — Ehrmann é uma marca dele, não um cliente separado)
const { data: cliente, error: errCliente } = await supabase
  .from('clientes')
  .select('id, organization_id')
  .ilike('nome', '%Trevo%')
  .maybeSingle()
if (errCliente || !cliente) {
  console.log('ERRO: cliente Trevo/Ehrmann não encontrado.', errCliente?.message ?? '')
  process.exit(1)
}
const ORGANIZATION_ID = cliente.organization_id
const CLIENTE_ID = cliente.id

// 2. Localiza marca "Ehrmann"
const { data: onb } = await supabase.from('onboarding_clientes').select('token').eq('cliente_id', CLIENTE_ID).maybeSingle()
const { data: marcas } = await supabase.from('onboarding_marcas').select('id, nome').eq('token', onb.token)

const marcaEhrmann = marcas?.find((m) => m.nome.trim().toLowerCase() === 'ehrmann')
if (!marcaEhrmann) {
  console.log('ERRO: marca "Ehrmann" não encontrada. Rode scripts/fix-hierarquia-marcas-trevo.mjs primeiro.')
  process.exit(1)
}

const DOCS_DIR = resolve(process.cwd(), 'clientes/ehrmann')

const registros = [
  {
    arquivo: 'perfil-criadores-gifting_2026-07-14/perfil-criadores-gifting-ehrmann.md',
    categoria: 'personas',
    subcategoria: 'perfil_criadores',
    titulo: 'Perfil de Criadores & Gifting — Ehrmann',
  },
  {
    arquivo: 'cronograma-agosto-2026_2026-07-14/01-temas-e-pilares-agosto.md',
    categoria: 'calendario',
    subcategoria: 'pilares_editoriais',
    titulo: 'Temas e Pilares — Agosto 2026 — Ehrmann',
  },
  {
    arquivo: 'estrategia-trafego-pago_2026-07-15/01-estrategia-trafego-pago.md',
    categoria: 'parametros',
    subcategoria: 'estrategia_trafego',
    titulo: 'Estratégia de Tráfego Pago — Ehrmann',
  },
  {
    arquivo: 'plataforma-campanha-mestre_2026-06-24/04-versao-final.md',
    categoria: 'brand_system',
    subcategoria: 'plataforma_campanha',
    titulo: 'Plataforma de Campanha Mestre — Ehrmann',
  },
]

for (const reg of registros) {
  const texto = readFileSync(resolve(DOCS_DIR, reg.arquivo), 'utf-8')

  const { data: existente } = await supabase
    .from('universo_marca')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('cliente_id', CLIENTE_ID)
    .eq('marca_id', marcaEhrmann.id)
    .eq('subcategoria', reg.subcategoria)
    .maybeSingle()

  const payload = {
    organization_id: ORGANIZATION_ID,
    cliente_id: CLIENTE_ID,
    marca_id: marcaEhrmann.id,
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

console.log('\nAVISO: "Ehrmann High Protein", "Ehrmann Apreciare" e "Ehrmann Apreciare Fit" não têm documento próprio ainda — herdarão contexto de "Ehrmann" via buildContextoCliente.')
