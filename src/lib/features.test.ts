import { describe, it, expect } from 'vitest'
import { FEATURES, ROTAS_POR_FEATURE, featureBloqueando, isFeatureEnabled } from './features'

describe('feature flags — mapa de rotas', () => {
  it('toda rota mapeada aponta para uma feature que existe', () => {
    for (const [, key] of ROTAS_POR_FEATURE) {
      expect(key in FEATURES).toBe(true)
    }
  })

  it('prefixos específicos vêm antes dos gerais (/socias/financeiro antes de /socias)', () => {
    const idxEspecifico = ROTAS_POR_FEATURE.findIndex(([p]) => p === '/socias/financeiro')
    const idxGeral = ROTAS_POR_FEATURE.findIndex(([p]) => p === '/socias')
    expect(idxEspecifico).toBeGreaterThanOrEqual(0)
    expect(idxEspecifico).toBeLessThan(idxGeral)
  })
})

describe('featureBloqueando — o gate de rota do proxy', () => {
  it('bloqueia a rota de um módulo desligado', () => {
    // No lançamento, imagens está off.
    expect(FEATURES.imagens).toBe(false)
    expect(featureBloqueando('/imagens')).toBe('imagens')
    expect(featureBloqueando('/imagens/qualquer/subrota')).toBe('imagens')
  })

  it('não bloqueia rota de módulo ligado', () => {
    expect(FEATURES.calendario).toBe(true)
    expect(featureBloqueando('/calendario')).toBeNull()
  })

  it('não bloqueia o núcleo (board, dashboard, clientes, agentes)', () => {
    for (const p of ['/board', '/dashboard', '/clientes', '/agentes', '/admin/usuarios', '/perfil']) {
      expect(featureBloqueando(p)).toBeNull()
    }
  })

  it('casa o prefixo específico antes do geral', () => {
    // Com socias e financeiro ambos off, /socias/financeiro deve ser atribuído a
    // financeiro (o prefixo específico), não a socias.
    expect(featureBloqueando('/socias/financeiro')).toBe('financeiro')
  })

  it('não confunde prefixo com um caminho que só começa igual', () => {
    // '/cs' não deve bloquear '/clientes' (startsWith exige a barra).
    expect(featureBloqueando('/clientes')).toBeNull()
  })
})

describe('isFeatureEnabled', () => {
  it('reflete o estado de lançamento: só calendário ligado além do núcleo', () => {
    expect(isFeatureEnabled('calendario')).toBe(true)
    for (const off of ['imagens', 'reunioes', 'cs', 'nps', 'pipeline', 'socias', 'lgpd', 'marca_cliente'] as const) {
      expect(isFeatureEnabled(off)).toBe(false)
    }
  })
})
