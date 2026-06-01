'use client'

import { useState, useTransition } from 'react'
import { Timer, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { actionSalvarSla, type TipoDemandaSla } from './actions'

const CATEGORIA_LABELS: Record<string, string> = {
  redes_sociais: 'Redes Sociais',
  estrategia:    'Estratégia',
  embalagem:     'Embalagem',
  video:         'Vídeo',
  trafego:       'Tráfego',
  linkedin:      'LinkedIn',
  email:         'E-mail',
  apresentacao:  'Apresentação',
  relatorio:     'Relatório',
  outros:        'Outros',
}

interface TipoRowProps {
  tipo: TipoDemandaSla
}

function TipoRow({ tipo }: TipoRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [ativo, setAtivo] = useState(tipo.sla_ativo)
  const [prazoInicio, setPrazoInicio] = useState<string>(
    tipo.sla_prazo_inicio_horas?.toString() ?? '',
  )
  const [prazoResposta, setPrazoResposta] = useState<string>(
    tipo.sla_prazo_resposta_horas?.toString() ?? '',
  )
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSalvar() {
    setErro(null)
    setSalvo(false)
    startTransition(async () => {
      const result = await actionSalvarSla({
        tipoId: tipo.id,
        sla_ativo: ativo,
        sla_prazo_inicio_horas: prazoInicio ? parseInt(prazoInicio, 10) : null,
        sla_prazo_resposta_horas: prazoResposta ? parseInt(prazoResposta, 10) : null,
      })
      if (result.error) {
        setErro(result.error)
      } else {
        setSalvo(true)
        setTimeout(() => setSalvo(false), 2500)
      }
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Cabeçalho da linha */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full flex-none ${ativo ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
          <div>
            <p className="text-sm font-medium text-zinc-900">{tipo.nome}</p>
            <p className="text-xs text-zinc-400">{CATEGORIA_LABELS[tipo.categoria] ?? tipo.categoria}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tipo.sla_prazo_inicio_horas && (
            <span className="text-xs text-zinc-400 hidden sm:block">
              Início: {tipo.sla_prazo_inicio_horas}h
            </span>
          )}
          {tipo.sla_prazo_resposta_horas && (
            <span className="text-xs text-zinc-400 hidden sm:block">
              Resposta: {tipo.sla_prazo_resposta_horas}h
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-zinc-400" />
            : <ChevronDown className="h-4 w-4 text-zinc-400" />
          }
        </div>
      </button>

      {/* Formulário expandido */}
      {expanded && (
        <div className="border-t border-zinc-100 px-4 py-4 space-y-4">
          {/* Toggle SLA ativo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setAtivo((p) => !p)}
              className={`relative h-5 w-9 rounded-full transition-colors ${ativo ? 'bg-emerald-500' : 'bg-zinc-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-4' : ''}`}
              />
            </div>
            <span className="text-sm text-zinc-700">
              Monitoramento de SLA {ativo ? 'ativo' : 'desativado'}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            {/* Prazo de início */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Prazo para iniciar (horas)
              </label>
              <input
                type="number"
                min={1}
                max={720}
                value={prazoInicio}
                onChange={(e) => setPrazoInicio(e.target.value)}
                placeholder="Ex: 24"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                Máximo para equipe iniciar produção após criação do card
              </p>
            </div>

            {/* Prazo de resposta */}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Prazo de resposta (horas)
              </label>
              <input
                type="number"
                min={1}
                max={720}
                value={prazoResposta}
                onChange={(e) => setPrazoResposta(e.target.value)}
                placeholder="Ex: 48"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                Máximo para enviar ao cliente após entrar em produção
              </p>
            </div>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}

          <div className="flex justify-end">
            <button
              onClick={handleSalvar}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : salvo ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {salvo ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  tipos: TipoDemandaSla[]
}

export function SlaForm({ tipos }: Props) {
  // Agrupa por categoria
  const porCategoria = tipos.reduce<Record<string, TipoDemandaSla[]>>((acc, t) => {
    const cat = t.categoria
    acc[cat] = acc[cat] ?? []
    acc[cat].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(porCategoria).map(([categoria, items]) => (
        <div key={categoria}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {CATEGORIA_LABELS[categoria] ?? categoria}
          </p>
          <div className="space-y-2">
            {items.map((tipo) => (
              <TipoRow key={tipo.id} tipo={tipo} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
