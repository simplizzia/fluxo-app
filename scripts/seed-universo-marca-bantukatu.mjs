/**
 * Popula universo_marca do Bantu-Katu com os docs estratégicos já aprovados
 * (personas, posicionamento, parâmetros de conteúdo), para que os agentes
 * criativos (criativo.carrossel, criativo.post-foto-real, etc.) tenham
 * contexto de marca real ao rodar via buildContextoCliente().
 *
 * Também neutraliza o registro "briefing_completo" pré-existente, que ainda
 * usa a metáfora "porta de entrada" e o pilar de "pessoas que fazem parte do
 * movimento" — ambos revertidos nas revisões de 2026-07-03 — para não
 * injetar instrução contraditória junto com o conteúdo corrigido.
 *
 * Uso: node scripts/seed-universo-marca-bantukatu.mjs
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

const ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'
const CLIENTE_ID = 'c0e59f11-6ff0-4c02-b08c-1c5b5459ba6e'
const MARCA_ID = '03b1ce4f-1416-4c6b-b04a-90d47ab91698'
const NOME_MARCA = 'Bantu-Katu | Movimento Cultural'
const DOCS_DIR = resolve(process.cwd(), 'clientes/bantu-katu/estrategia_2026-07-03')

const registros = [
  {
    arquivo: '01-personas.md',
    categoria: 'personas',
    subcategoria: 'personas',
    titulo: `Personas — ${NOME_MARCA}`,
    gerado_por_agente: 'personas.personas',
  },
  {
    arquivo: '04-posicionamento-marca.md',
    categoria: 'brand_system',
    subcategoria: 'posicionamento',
    titulo: `Posicionamento & Marca — ${NOME_MARCA}`,
    gerado_por_agente: 'brand-system.principal',
  },
  {
    arquivo: '06-parametros-conteudo.md',
    categoria: 'parametros',
    subcategoria: 'parametros',
    titulo: `Parâmetros de Conteúdo — ${NOME_MARCA}`,
    gerado_por_agente: 'inteligencia.parametrizador',
  },
]

for (const reg of registros) {
  const texto = readFileSync(resolve(DOCS_DIR, reg.arquivo), 'utf-8')

  const { data: existente } = await supabase
    .from('universo_marca')
    .select('id')
    .eq('organization_id', ORGANIZATION_ID)
    .eq('cliente_id', CLIENTE_ID)
    .eq('marca_id', MARCA_ID)
    .eq('subcategoria', reg.subcategoria)
    .maybeSingle()

  const payload = {
    organization_id: ORGANIZATION_ID,
    cliente_id: CLIENTE_ID,
    marca_id: MARCA_ID,
    categoria: reg.categoria,
    subcategoria: reg.subcategoria,
    titulo: reg.titulo,
    conteudo: { texto },
    visivel_para_cliente: false,
    gerado_por_agente: reg.gerado_por_agente,
  }

  if (existente) {
    const { error } = await supabase.from('universo_marca').update(payload).eq('id', existente.id)
    console.log(error ? `ERRO update ${reg.subcategoria}: ${error.message}` : `OK update ${reg.subcategoria} (${texto.length} chars)`)
  } else {
    const { error } = await supabase.from('universo_marca').insert(payload)
    console.log(error ? `ERRO insert ${reg.subcategoria}: ${error.message}` : `OK insert ${reg.subcategoria} (${texto.length} chars)`)
  }
}

// Neutraliza o briefing_completo pré-existente (stale, contradiz o posicionamento corrigido)
const TEXTO_NEUTRALIZADO = `> **Nota (2026-07-03):** este briefing geral foi SUPERADO pelas revisões estratégicas do mesmo dia — ver "Posicionamento & Marca" e "Parâmetros de Conteúdo" nesta mesma base de conhecimento. Duas correções importantes que substituem o que este documento dizia antes:
1. A promessa de marca não usa mais a metáfora "porta de entrada" (estática/ambígua) — a promessa atual é "O movimento vem até você".
2. O pilar de conteúdo "pessoas que fazem parte do movimento" (perfis de facilitadores/núcleo) foi removido a pedido do cliente — o conteúdo não gira em torno de indivíduos.

Use sempre "Posicionamento & Marca" e "Parâmetros de Conteúdo" como fonte de verdade sobre tom, promessa e pilares. Este registro é mantido só como histórico do briefing inicial.`

const { error: errBriefing } = await supabase
  .from('universo_marca')
  .update({ conteudo: { texto: TEXTO_NEUTRALIZADO } })
  .eq('organization_id', ORGANIZATION_ID)
  .eq('cliente_id', CLIENTE_ID)
  .eq('subcategoria', 'briefing_completo')

console.log(errBriefing ? `ERRO neutralizar briefing_completo: ${errBriefing.message}` : 'OK neutralizado briefing_completo (stale)')
