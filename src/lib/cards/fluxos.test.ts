import { describe, it, expect } from 'vitest'
import type { StatusCard } from '@/types/database'
import {
  type FluxoEtapa,
  type KindEtapa,
  type GatilhoAvanco,
  etapasOrdenadas,
  proximaEtapa,
  avancoAutomatico,
  resolveAgente,
  avancarPortao,
  deveAutoAvancar,
  statusProtegido,
  proximaAcaoLabel,
} from './fluxos'

// Helper: monta uma etapa completa a partir do essencial.
let seq = 0
function mk(
  ordem: number,
  kind: KindEtapa,
  avanca_por: GatilhoAvanco,
  status_canonico: StatusCard,
  extra: Partial<FluxoEtapa> = {},
): FluxoEtapa {
  seq += 1
  return {
    id: `e${ordem}-${seq}`,
    organization_id: 'org',
    fluxo_id: 'f',
    slug: `etapa-${ordem}`,
    label: `Etapa ${ordem}`,
    ordem,
    kind,
    avanca_por,
    agente_slug: kind === 'agente' ? 'algum.agente' : null,
    visivel_cliente: false,
    status_canonico,
    ativo: true,
    ...extra,
  }
}

// Fluxo representativo (estilo conteudo-social): tem execucao, agente, dois
// portoes humanos, uma etapa de envio agendado (cron) e dois status protegidos.
function fluxoRepresentativo(): FluxoEtapa[] {
  return [
    mk(1, 'execucao', 'arquivo_entrega', 'em_andamento', { slug: 'design' }),
    mk(2, 'agente', 'agente_ok', 'em_andamento', { slug: 'revisao-visual' }),
    mk(3, 'portao_humano', 'manual', 'em_andamento', { slug: 'aprovacao-interna' }),
    mk(4, 'execucao', 'cron_data_cliente', 'em_andamento', { slug: 'aguardando-envio' }),
    mk(5, 'portao_humano', 'manual', 'para_aprovacao', { slug: 'aprovacao-cliente' }),
    mk(6, 'execucao', 'arquivo_entrega', 'necessita_ajustes', { slug: 'ajustes' }),
    mk(7, 'terminal', 'nenhum', 'concluido', { slug: 'publicado' }),
  ]
}

const byId = (etapas: FluxoEtapa[], slug: string) =>
  etapas.find((e) => e.slug === slug)!.id

describe('ordenacao e navegacao de etapas', () => {
  it('ordena por ordem e ignora inativas', () => {
    const es = [mk(3, 'terminal', 'nenhum', 'concluido'), mk(1, 'execucao', 'arquivo_entrega', 'a_fazer'), mk(2, 'agente', 'agente_ok', 'em_andamento', { ativo: false })]
    expect(etapasOrdenadas(es).map((e) => e.ordem)).toEqual([1, 3])
  })

  it('proximaEtapa: sem atual comeca na primeira; na ultima devolve null', () => {
    const es = fluxoRepresentativo()
    expect(proximaEtapa(es, null)?.slug).toBe('design')
    expect(proximaEtapa(es, byId(es, 'publicado'))).toBeNull()
  })
})

describe('deveAutoAvancar: so o gatilho da etapa satisfaz', () => {
  it('arquivo_entrega precisa de arquivoEntregue', () => {
    const e = mk(1, 'execucao', 'arquivo_entrega', 'em_andamento')
    expect(deveAutoAvancar(e, { arquivoEntregue: true })).toBe(true)
    expect(deveAutoAvancar(e, { checklistCompleto: true })).toBe(false)
  })
  it('manual, cron e nenhum nunca auto-avancam', () => {
    for (const g of ['manual', 'cron_data_cliente', 'nenhum'] as const) {
      const e = mk(1, 'execucao', g, 'em_andamento')
      expect(deveAutoAvancar(e, { arquivoEntregue: true, checklistCompleto: true, agenteAprovou: true })).toBe(false)
    }
  })
})

describe('avancoAutomatico: regra dura no nivel do fluxo', () => {
  it('avanca uma etapa quando o sinal casa', () => {
    const es = fluxoRepresentativo()
    const prox = avancoAutomatico(es, byId(es, 'design'), { arquivoEntregue: true })
    expect(prox?.slug).toBe('revisao-visual')
  })

  it('nao avanca sem o sinal certo', () => {
    const es = fluxoRepresentativo()
    expect(avancoAutomatico(es, byId(es, 'design'), { checklistCompleto: true })).toBeNull()
  })

  it('nunca avanca a partir de um portao humano', () => {
    const es = fluxoRepresentativo()
    expect(avancoAutomatico(es, byId(es, 'aprovacao-interna'), { arquivoEntregue: true, agenteAprovou: true })).toBeNull()
  })

  it('etapa de envio agendado (cron) nao avanca por sinal', () => {
    const es = fluxoRepresentativo()
    expect(avancoAutomatico(es, byId(es, 'aguardando-envio'), { arquivoEntregue: true, agenteAprovou: true })).toBeNull()
  })

  it('NUNCA entra por sinal num status protegido (rede de seguranca)', () => {
    // Fluxo minimo onde a execucao cai direto num status protegido.
    const es = [
      mk(1, 'execucao', 'arquivo_entrega', 'em_andamento', { slug: 'produz' }),
      mk(2, 'portao_humano', 'manual', 'para_aprovacao', { slug: 'aprova-cliente' }),
    ]
    // Mesmo com o sinal satisfeito, nao pula para o status protegido.
    expect(avancoAutomatico(es, byId(es, 'produz'), { arquivoEntregue: true })).toBeNull()
  })

  it('invariante: nenhum sinal leva a um status protegido, em nenhuma etapa', () => {
    const es = fluxoRepresentativo()
    const todosSinais = { checklistCompleto: true, arquivoEntregue: true, agenteAprovou: true }
    for (const e of es) {
      const prox = avancoAutomatico(es, e.id, todosSinais)
      if (prox) expect(statusProtegido(prox.status_canonico)).toBe(false)
    }
  })
})

describe('resolveAgente', () => {
  it('aprovado avanca para a proxima etapa', () => {
    const es = fluxoRepresentativo()
    const r = resolveAgente(es, byId(es, 'revisao-visual'), true)
    expect(r).toEqual({ tipo: 'avancar', etapa: expect.objectContaining({ slug: 'aprovacao-interna' }) })
  })
  it('reprovado vai para ajustes', () => {
    const es = fluxoRepresentativo()
    expect(resolveAgente(es, byId(es, 'revisao-visual'), false)).toEqual({ tipo: 'ajustes' })
  })
  it('etapa que nao e de agente devolve nada', () => {
    const es = fluxoRepresentativo()
    expect(resolveAgente(es, byId(es, 'design'), true)).toEqual({ tipo: 'nada' })
  })
})

describe('avancarPortao', () => {
  it('do portao vai para a proxima etapa', () => {
    const es = fluxoRepresentativo()
    expect(avancarPortao(es, byId(es, 'aprovacao-interna'))?.slug).toBe('aguardando-envio')
  })
  it('fora de um portao devolve null', () => {
    const es = fluxoRepresentativo()
    expect(avancarPortao(es, byId(es, 'design'))).toBeNull()
  })
})

describe('proximaAcaoLabel', () => {
  it('descreve de quem e a bola', () => {
    const es = fluxoRepresentativo()
    expect(proximaAcaoLabel(es.find((e) => e.slug === 'aprovacao-interna')!)).toMatch(/Aguardando/)
    expect(proximaAcaoLabel(null)).toMatch(/Sem fluxo/)
  })
})
