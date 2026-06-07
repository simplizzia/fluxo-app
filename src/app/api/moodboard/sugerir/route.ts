/**
 * POST /api/moodboard/sugerir — a Izzi propõe a base do moodboard de uma marca.
 * Body: { clienteId, marcaId }
 * Retorna { itens: SugestaoItem[] } — efêmero, nada é gravado.
 */
import { NextRequest } from 'next/server'
import { requirePapel } from '@/lib/dal'
import { executarAgente } from '@/lib/agents/executor'

export const maxDuration = 60

const SECOES_VALIDAS = ['fotografia', 'tipografia', 'cor', 'textura', 'referencia_marca', 'geral']

export interface SugestaoItem {
  secao: string
  tipo: 'cor' | 'texto'
  valor: string
  nota: string
  anti: boolean
}

function parseSugestoes(raw: string): SugestaoItem[] {
  // Remove cercas de código e extrai o primeiro bloco [ ... ]
  let texto = raw.replace(/```(?:json)?/gi, '').trim()
  const ini = texto.indexOf('[')
  const fim = texto.lastIndexOf(']')
  if (ini === -1 || fim === -1 || fim < ini) return []
  texto = texto.slice(ini, fim + 1)

  let arr: unknown
  try { arr = JSON.parse(texto) } catch { return [] }
  if (!Array.isArray(arr)) return []

  const out: SugestaoItem[] = []
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const secao = String(o.secao ?? '').trim()
    const tipo = String(o.tipo ?? '').trim()
    const valor = String(o.valor ?? '').trim()
    if (!SECOES_VALIDAS.includes(secao)) continue
    if (tipo !== 'cor' && tipo !== 'texto') continue
    if (!valor) continue
    if (tipo === 'cor' && !/^#[0-9a-fA-F]{6}$/.test(valor)) continue
    out.push({
      secao,
      tipo,
      valor,
      nota: String(o.nota ?? '').trim(),
      anti: o.anti === true,
    })
  }
  return out
}

export async function POST(request: NextRequest) {
  const profile = await requirePapel('socia', 'gestao')
  const { clienteId, marcaId } = await request.json() as { clienteId: string; marcaId: string }

  if (!clienteId || !marcaId) {
    return Response.json({ error: 'clienteId e marcaId obrigatórios' }, { status: 400 })
  }

  const result = await executarAgente({
    organizationId: profile.organization_id,
    agenteChave: 'brand-system.moodboard',
    clienteId,
    marcaId,
    // Modelo mais forte = sugestões muito mais on-brand. maxTokens controlado
    // para caber no limite de 60s da função mesmo com o modelo maior.
    model: 'claude-opus-4-5',
    maxTokens: 2400,
    input: {
      instrucao: 'Proponha a base do moodboard desta marca com base no contexto fornecido. Responda apenas com o array JSON.',
    },
  })

  if (!result.output) {
    return Response.json({ error: result.error ?? 'Falha ao gerar sugestões' }, { status: 500 })
  }

  const itens = parseSugestoes(result.output)
  if (itens.length === 0) {
    return Response.json({ error: 'Não consegui interpretar as sugestões. Tente de novo.' }, { status: 500 })
  }

  return Response.json({ itens })
}
