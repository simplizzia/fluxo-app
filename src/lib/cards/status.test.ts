import { describe, it, expect } from 'vitest'
import { ORDEM_STATUS, STATUS_CONFIG, TRANSICOES_LIVRES, motivoBloqueio, podeMover } from './status'
import type { StatusCard } from '@/types/database'

const TODOS = ORDEM_STATUS as readonly StatusCard[]

describe('configuração de status', () => {
  it('cobre todos os status do enum, sem sobra nem falta', () => {
    expect(new Set(TODOS).size).toBe(TODOS.length)
    expect(Object.keys(STATUS_CONFIG).sort()).toEqual([...TODOS].sort())
    expect(Object.keys(TRANSICOES_LIVRES).sort()).toEqual([...TODOS].sort())
  })

  it('não declara transição para um status inexistente', () => {
    for (const destinos of Object.values(TRANSICOES_LIVRES)) {
      for (const d of destinos) expect(TODOS).toContain(d)
    }
  })
})

describe('regra crítica: status protegidos exigem ação dedicada', () => {
  // O motivo de a regra existir: cada um destes carrega efeitos que o simples
  // arrastar do card pularia (arquivo de entrega, registro de aprovação,
  // notificação ao cliente, motivo de cancelamento).
  const PROTEGIDOS: StatusCard[] = ['para_aprovacao', 'concluido', 'cancelado']

  for (const destino of PROTEGIDOS) {
    it(`nenhuma origem alcança "${destino}" por movimento direto`, () => {
      for (const origem of TODOS) {
        if (origem === destino) continue
        expect(podeMover(origem, destino)).toBe(false)
        expect(motivoBloqueio(origem, destino)).toBeTruthy()
      }
    })
  }

  it('explica qual ação usar, em vez de só recusar', () => {
    expect(motivoBloqueio('em_andamento', 'para_aprovacao')).toMatch(/Enviar para aprovação/i)
    expect(motivoBloqueio('em_andamento', 'cancelado')).toMatch(/Cancelar demanda/i)
    expect(motivoBloqueio('para_aprovacao', 'concluido')).toMatch(/cliente aprova/i)
  })
})

describe('fluxo de trabalho normal', () => {
  it('permite o caminho de produção', () => {
    expect(podeMover('aguardando_info', 'a_fazer')).toBe(true)
    expect(podeMover('a_fazer', 'em_andamento')).toBe(true)
    expect(podeMover('necessita_ajustes', 'em_andamento')).toBe(true)
  })

  it('permite voltar atrás dentro da produção', () => {
    expect(podeMover('em_andamento', 'a_fazer')).toBe(true)
    expect(podeMover('a_fazer', 'aguardando_info')).toBe(true)
  })

  it('permite retratar um envio antes de o cliente responder', () => {
    expect(podeMover('para_aprovacao', 'em_andamento')).toBe(true)
  })

  it('trata mover para o próprio status como no-op, não como erro', () => {
    for (const s of TODOS) expect(motivoBloqueio(s, s)).toBeNull()
  })
})

describe('estados finais', () => {
  it('não reabre card concluído nem cancelado por arraste', () => {
    for (const destino of TODOS) {
      if (destino !== 'concluido') expect(podeMover('concluido', destino)).toBe(false)
      if (destino !== 'cancelado') expect(podeMover('cancelado', destino)).toBe(false)
    }
  })

  it('orienta a duplicar quando a demanda foi cancelada', () => {
    expect(motivoBloqueio('cancelado', 'a_fazer')).toMatch(/[Dd]uplique/)
  })
})
