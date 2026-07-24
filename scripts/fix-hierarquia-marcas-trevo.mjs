/**
 * Corrige a hierarquia de marcas da Trevo Lácteos | Ehrmann em onboarding_marcas.
 *
 * Estado encontrado em produção (2026-07-16): Institucional era "mãe" e Trevo/
 * Ehrmann eram "sub" dela — uma cadeia de 3 níveis (Institucional > Trevo >
 * Trevo Kids) que buildContextoCliente() não percorre inteira (só sobe 1 nível
 * na hierarquia). Corrige para: Institucional, Trevo e Ehrmann como marcas-mãe
 * IRMÃS entre si (nivel='mae', marca_pai_id=NULL); insere as sub-marcas de
 * linha de produto apontando para a marca-mãe de produto correta.
 *
 * Idempotente: busca marcas por nome em runtime (não crava UUIDs), pode ser
 * rodado mais de uma vez sem duplicar ou reverter o que já foi corrigido.
 *
 * Uso: node scripts/fix-hierarquia-marcas-trevo.mjs
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

const SUB_MARCAS = [
  { nome: 'Trevo Kids', paiNome: 'Trevo', ordem: 10 },
  { nome: 'Ehrmann High Protein', paiNome: 'Ehrmann', ordem: 20 },
  { nome: 'Ehrmann Apreciare', paiNome: 'Ehrmann', ordem: 30 },
  { nome: 'Ehrmann Apreciare Fit', paiNome: 'Ehrmann', ordem: 40 },
]

// 1. Localiza o cliente Trevo Lácteos | Ehrmann
const { data: cliente, error: errCliente } = await supabase
  .from('clientes')
  .select('id, nome, organization_id')
  .ilike('nome', '%Trevo%')
  .maybeSingle()

if (errCliente || !cliente) {
  console.log('ERRO: cliente Trevo não encontrado.', errCliente?.message ?? '')
  process.exit(1)
}
console.log(`Cliente: ${cliente.nome} (${cliente.id})`)

// 2. Localiza o token de onboarding
const { data: onb, error: errOnb } = await supabase
  .from('onboarding_clientes')
  .select('token')
  .eq('cliente_id', cliente.id)
  .maybeSingle()

if (errOnb || !onb) {
  console.log('ERRO: onboarding_clientes não encontrado para este cliente.', errOnb?.message ?? '')
  process.exit(1)
}
console.log(`Token de onboarding: ${onb.token}`)

// 3. Busca as marcas atuais
const { data: marcas, error: errMarcas } = await supabase
  .from('onboarding_marcas')
  .select('id, nome, nivel, marca_pai_id, ordem')
  .eq('token', onb.token)
  .order('ordem')

if (errMarcas) {
  console.log('ERRO ao buscar marcas:', errMarcas.message)
  process.exit(1)
}

console.log('\nEstado atual:')
for (const m of marcas ?? []) {
  console.log(`  - ${m.nome} | nivel=${m.nivel} | marca_pai_id=${m.marca_pai_id ?? 'NULL'}`)
}

const trevo = marcas?.find((m) => m.nome.trim().toLowerCase() === 'trevo')
const ehrmann = marcas?.find((m) => m.nome.trim().toLowerCase() === 'ehrmann')

if (!trevo || !ehrmann) {
  console.log('\nERRO: não encontrei marcas "Trevo" e/ou "Ehrmann" pelo nome exato. Ajuste o script manualmente.')
  process.exit(1)
}

// 4. Promove Trevo e Ehrmann a marca-mãe (irmãs, sem pai)
console.log('\nPromovendo Trevo e Ehrmann a nivel=mae, marca_pai_id=NULL...')
for (const marca of [trevo, ehrmann]) {
  if (marca.nivel === 'mae' && marca.marca_pai_id === null) {
    console.log(`  - ${marca.nome}: já está correto, pulando.`)
    continue
  }
  const { error } = await supabase
    .from('onboarding_marcas')
    .update({ nivel: 'mae', marca_pai_id: null })
    .eq('id', marca.id)
  console.log(error ? `  ERRO ao promover ${marca.nome}: ${error.message}` : `  OK: ${marca.nome} agora é mae/sem pai`)
}

// 5. Insere sub-marcas novas (idempotente por nome)
console.log('\nInserindo sub-marcas de linha de produto...')
const paiPorNome = { Trevo: trevo.id, Ehrmann: ehrmann.id }

for (const sub of SUB_MARCAS) {
  const jaExiste = (marcas ?? []).some((m) => m.nome.trim().toLowerCase() === sub.nome.toLowerCase())
  if (jaExiste) {
    console.log(`  - ${sub.nome}: já existe, pulando.`)
    continue
  }
  const { error } = await supabase.from('onboarding_marcas').insert({
    organization_id: cliente.organization_id,
    token: onb.token,
    nome: sub.nome,
    nivel: 'sub',
    marca_pai_id: paiPorNome[sub.paiNome],
    ordem: sub.ordem,
    status: 'pending',
  })
  console.log(error ? `  ERRO ao inserir ${sub.nome}: ${error.message}` : `  OK: ${sub.nome} inserida (pai=${sub.paiNome})`)
}

// 6. Estado final
const { data: marcasFinal } = await supabase
  .from('onboarding_marcas')
  .select('id, nome, nivel, marca_pai_id, ordem')
  .eq('token', onb.token)
  .order('ordem')

console.log('\nEstado final:')
for (const m of marcasFinal ?? []) {
  const paiNome = m.marca_pai_id ? (marcasFinal ?? []).find((p) => p.id === m.marca_pai_id)?.nome : null
  console.log(`  - ${m.nome} (${m.id}) | nivel=${m.nivel} | pai=${paiNome ?? 'nenhum'}`)
}
