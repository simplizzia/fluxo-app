'use client'

/**
 * UsoOrgConfig — formulário de configuração de controle de uso (socia only).
 * Permite escolher a unidade de controle (demandas / horas / créditos) e
 * definir os créditos por tipo de demanda quando a unidade é "creditos".
 */

import { useActionState, useRef, useState } from 'react'
import { Settings2, Save, Info } from 'lucide-react'
import { actionSalvarConfigUsoOrg } from './actions'

interface TipoDemanda {
  id: string
  nome: string
}

interface Props {
  unidadeControle: 'demandas' | 'horas' | 'creditos'
  creditosPorTipo: Record<string, number>
  tiposDemanda: TipoDemanda[]
}

type State = { error?: string; success?: boolean } | null

const UNIDADES = [
  { value: 'demandas', label: 'Demandas', desc: 'Conta o número de cards criados por mês.' },
  { value: 'horas', label: 'Horas', desc: 'Soma as horas realizadas por mês.' },
  { value: 'creditos', label: 'Créditos', desc: 'Cada tipo de demanda consome um número de créditos configurável.' },
] as const

export function UsoOrgConfig({ unidadeControle, creditosPorTipo, tiposDemanda }: Props) {
  const [aberto, setAberto] = useState(false)
  const [unidade, setUnidade] = useState<'demandas' | 'horas' | 'creditos'>(unidadeControle)
  const [creditos, setCreditos] = useState<Record<string, number>>(creditosPorTipo)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, pending] = useActionState<State, FormData>(
    actionSalvarConfigUsoOrg,
    null,
  )

  function nomeChave(nome: string) {
    return nome.toLowerCase().replace(/\s+/g, '_')
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-brand transition"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Configurar controle de uso
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-zinc-400" />
          Configuração de Controle de Uso
        </h3>
        <button
          onClick={() => setAberto(false)}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition"
        >
          Fechar
        </button>
      </div>

      <form ref={formRef} action={formAction} className="space-y-5">
        {/* Unidade de controle */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Unidade de controle</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {UNIDADES.map((u) => (
              <label
                key={u.value}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition ${
                  unidade === u.value
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="unidade_controle"
                  value={u.value}
                  checked={unidade === u.value}
                  onChange={() => setUnidade(u.value)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-zinc-800">{u.label}</span>
                <span className="text-[11px] text-zinc-500 leading-relaxed">{u.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Créditos por tipo — só aparece quando unidade = creditos */}
        {unidade === 'creditos' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Créditos por tipo de demanda</p>
              <span title="Quantos créditos cada tipo consome ao criar um card">
                <Info className="h-3.5 w-3.5 text-zinc-400" />
              </span>
            </div>

            {tiposDemanda.length > 0 ? (
              <div className="space-y-2">
                {tiposDemanda.map((tipo) => {
                  const chave = nomeChave(tipo.nome)
                  return (
                    <div key={tipo.id} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">{tipo.nome}</span>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={creditos[chave] ?? creditos['default'] ?? 1}
                        onChange={(e) =>
                          setCreditos((prev) => ({ ...prev, [chave]: parseInt(e.target.value, 10) || 0 }))
                        }
                        className="w-20 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                      <span className="text-xs text-zinc-400 w-14">créd.</span>
                    </div>
                  )
                })}

                {/* Default */}
                <div className="flex items-center gap-3 border-t border-dashed border-zinc-200 pt-2 mt-2">
                  <span className="min-w-0 flex-1 text-sm text-zinc-500 italic">Padrão (outros tipos)</span>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={creditos['default'] ?? 1}
                    onChange={(e) =>
                      setCreditos((prev) => ({ ...prev, default: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-20 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <span className="text-xs text-zinc-400 w-14">créd.</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">Nenhum tipo de demanda cadastrado.</p>
            )}

            {/* Hidden field com o JSON serializado */}
            <input
              type="hidden"
              name="creditos_por_tipo"
              value={JSON.stringify(creditos)}
            />
          </div>
        )}

        {/* Feedback */}
        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-600">Configuração salva com sucesso.</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:opacity-90 transition"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
