/**
 * Bootstrap da primeira sócia no Fluxo App.
 *
 * Uso:
 *   node scripts/bootstrap-socia.mjs <email> <nome>
 *
 * Exemplo:
 *   node scripts/bootstrap-socia.mjs joana@simplizzia.com.br "Joana Silva"
 *
 * Requer as variáveis de ambiente do .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Carrega .env.local manualmente (sem dotenv instalado)
function loadEnv() {
  const env = {}
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      env[key] = val
    }
  } catch {
    // ignora se não existir
  }
  return env
}

const env = { ...loadEnv(), ...process.env }

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = env.NEXT_PUBLIC_APP_URL || 'https://app.simplizzia.com.br'
const ORGANIZATION_ID = env.NEXT_PUBLIC_ORGANIZATION_ID || '00000000-0000-0000-0000-000000000001'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.')
  process.exit(1)
}

const [, , email, nome] = process.argv

if (!email || !nome) {
  console.error('❌  Uso: node scripts/bootstrap-socia.mjs <email> <nome>')
  console.error('   Ex:  node scripts/bootstrap-socia.mjs joana@simplizzia.com.br "Joana Silva"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`\n🚀  Criando convite para ${nome} <${email}> com papel socia...`)

const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: {
    nome,
    papel: 'socia',
    organization_id: ORGANIZATION_ID,
  },
  redirectTo: `${APP_URL}/auth/callback?type=invite`,
})

if (error) {
  console.error('❌  Erro:', error.message)
  process.exit(1)
}

console.log(`✅  Convite enviado para ${email}`)
console.log(`    User ID: ${data.user?.id}`)
console.log(`\n📧  A sócia receberá um email para definir a senha.`)
console.log(`    Após o login, o perfil será criado automaticamente com papel=socia.\n`)
