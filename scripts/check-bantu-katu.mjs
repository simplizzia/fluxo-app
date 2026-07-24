/**
 * Verifica se o Bantu-Katu já existe no banco do Fluxo App com contexto
 * suficiente (clientes, onboarding_marcas, universo_marca) para os agentes
 * criativos rodarem com contexto real. Somente leitura.
 *
 * Uso: node scripts/check-bantu-katu.mjs
 * Requer as env vars do .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltam env vars NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('--- clientes (nome ilike %bantu%) ---')
const { data: clientes, error: errClientes } = await supabase
  .from('clientes')
  .select('id, nome, status, organization_id')
  .ilike('nome', '%bantu%')
console.log(errClientes ? `ERRO: ${errClientes.message}` : JSON.stringify(clientes, null, 2))

if (clientes && clientes.length > 0) {
  for (const cliente of clientes) {
    console.log(`\n--- onboarding_clientes (cliente_id=${cliente.id}) ---`)
    const { data: session, error: errSession } = await supabase
      .from('onboarding_clientes')
      .select('token, client_name')
      .eq('cliente_id', cliente.id)
      .maybeSingle()
    console.log(errSession ? `ERRO session: ${errSession.message}` : JSON.stringify(session, null, 2))

    if (session?.token) {
      console.log(`\n--- onboarding_marcas (token=${session.token}) ---`)
      const { data: marcas, error: errMarcas } = await supabase
        .from('onboarding_marcas')
        .select('id, nome, nivel, publico, posicionamento_atual, concorrentes, contexto_estrategico, briefing_output')
        .eq('token', session.token)
      console.log(errMarcas ? `ERRO marcas: ${errMarcas.message}` : JSON.stringify(marcas, null, 2))
    }

    console.log(`\n--- universo_marca (cliente_id=${cliente.id}) ---`)
    const { data: universo, error: errUniverso } = await supabase
      .from('universo_marca')
      .select('id, categoria, subcategoria, titulo, marca_id, gerado_por_agente')
      .eq('cliente_id', cliente.id)
    console.log(errUniverso ? `ERRO universo: ${errUniverso.message}` : JSON.stringify(universo, null, 2))
  }
} else {
  console.log('\nNenhum cliente com nome contendo "bantu" encontrado.')
}
