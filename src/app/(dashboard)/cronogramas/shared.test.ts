import { describe, it, expect } from 'vitest'
import { parseCalendario, normalizarViabilidade, FORMATO_PARA_TIPO_SLUG, mesReferenciaParaData } from './shared'

describe('parseCalendario — o ponto frágil do fluxo', () => {
  it('parseia um array JSON puro', () => {
    const out = '[{"tema":"post 1","ordem":1},{"tema":"post 2","ordem":2}]'
    const r = parseCalendario(out)
    expect(r).toHaveLength(2)
    expect(r?.[0].tema).toBe('post 1')
  })

  it('tolera prosa antes e depois do array', () => {
    const out = 'Claro! Aqui está o calendário:\n[{"tema":"x","ordem":1}]\nEspero que ajude.'
    const r = parseCalendario(out)
    expect(r).toHaveLength(1)
    expect(r?.[0].tema).toBe('x')
  })

  it('tolera cerca de código ```json', () => {
    const out = '```json\n[{"tema":"y","ordem":1}]\n```'
    expect(parseCalendario(out)?.[0].tema).toBe('y')
  })

  it('devolve null quando não há array', () => {
    expect(parseCalendario('Desculpe, não consegui gerar o calendário.')).toBeNull()
  })

  it('devolve null para JSON malformado em vez de estourar', () => {
    expect(parseCalendario('[{"tema": "sem fechar"')).toBeNull()
  })

  it('devolve null quando o JSON é um objeto, não um array', () => {
    expect(parseCalendario('{"tema":"x"}')).toBeNull()
  })

  it('lida com array vazio', () => {
    expect(parseCalendario('[]')).toEqual([])
  })
})

describe('normalizarViabilidade', () => {
  it('mantém valores válidos', () => {
    expect(normalizarViabilidade('roteiro_a_fechar')).toBe('roteiro_a_fechar')
    expect(normalizarViabilidade('so_ia')).toBe('so_ia')
  })

  it('cai para proposta em valor desconhecido ou vazio', () => {
    expect(normalizarViabilidade('inventado')).toBe('proposta')
    expect(normalizarViabilidade(undefined)).toBe('proposta')
  })
})

describe('mesReferenciaParaData — do card ("AAAA-MM") ao cronograma ("AAAA-MM-01")', () => {
  it('converte um mês válido', () => {
    expect(mesReferenciaParaData('2026-08')).toBe('2026-08-01')
    expect(mesReferenciaParaData('2026-12')).toBe('2026-12-01')
  })

  it('rejeita mês fora de 01–12', () => {
    expect(mesReferenciaParaData('2026-13')).toBeNull()
    expect(mesReferenciaParaData('2026-00')).toBeNull()
  })

  it('rejeita formato inválido, vazio ou nulo', () => {
    expect(mesReferenciaParaData('agosto 2026')).toBeNull()
    expect(mesReferenciaParaData('2026/08')).toBeNull()
    expect(mesReferenciaParaData('')).toBeNull()
    expect(mesReferenciaParaData(null)).toBeNull()
    expect(mesReferenciaParaData(undefined)).toBeNull()
  })
})

describe('mapeamento formato → tipo de demanda', () => {
  it('cobre os formatos que o agente produz', () => {
    for (const f of ['reel', 'carrossel', 'estatico', 'story', 'video']) {
      expect(FORMATO_PARA_TIPO_SLUG[f]).toBeTruthy()
    }
  })

  it('carrossel e estático viram os slugs corretos', () => {
    expect(FORMATO_PARA_TIPO_SLUG.carrossel).toBe('post-carrossel')
    expect(FORMATO_PARA_TIPO_SLUG.estatico).toBe('post-feed')
  })
})
