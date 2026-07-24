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

const { data, error } = await supabase
  .from('agent_catalog')
  .select('id, chave, nome, ativo, prompt_sistema')
  .in('chave', ['criativo.carrossel', 'criativo.post-foto-real'])

if (error) console.error(error)
for (const a of data ?? []) {
  console.log(`\n=== ${a.chave} (ativo=${a.ativo}) id=${a.id} ===`)
  console.log(a.prompt_sistema)
}
