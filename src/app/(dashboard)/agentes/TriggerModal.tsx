'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { actionTriggerAgente } from './actions'
import { actionBuscarMarcasCliente, type MarcaBasica } from '@/app/(dashboard)/board/actions'
import type { AgenteDef } from '@/lib/agents/catalog'
import type { ClienteSimples } from './actions'

interface Props {
  agente: AgenteDef
  clientes: ClienteSimples[]
  onClose: () => void
  onSuccess: () => void
}

export default function TriggerModal({ agente, clientes, onClose, onSuccess }: Props) {
  const [clienteId, setClienteId] = useState<string>('')
  const [marcaId, setMarcaId] = useState<string>('')
  const [marcas, setMarcas] = useState<MarcaBasica[]>([])
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [output, setOutput] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [pending, startTransition] = useTransition()

  // Ao trocar de cliente, busca as marcas dele. Sem escolher a marca, o agente
  // recebe o contexto de todas as marcas do cliente misturadas — a causa-raiz
  // que o escopo por marca resolve. Por isso o seletor aparece assim que há
  // marcas cadastradas.
  useEffect(() => {
    setMarcaId('')
    setMarcas([])
    if (!clienteId) return
    let cancelado = false
    actionBuscarMarcasCliente(clienteId).then(({ marcas }) => {
      if (!cancelado) setMarcas(marcas)
    })
    return () => { cancelado = true }
  }, [clienteId])

  function handleCampo(chave: string, valor: string) {
    setCampos((prev) => ({ ...prev, [chave]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOutput(null)

    // Validate required fields
    for (const field of agente.inputsSchema) {
      if (field.obrigatorio && !campos[field.chave]?.trim()) {
        setErro(`Campo obrigatório: ${field.label}`)
        return
      }
    }

    if (marcas.length > 0 && !marcaId) {
      setErro('Escolha a marca para não misturar o contexto de marcas irmãs.')
      return
    }

    startTransition(async () => {
      const res = await actionTriggerAgente(
        agente.chave,
        campos,
        clienteId || undefined,
        marcaId || undefined,
      )
      if (res.error) {
        setErro(res.error)
      } else {
        setOutput(res.output ?? '')
        onSuccess()
      }
    })
  }

  async function handleCopiar() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">{agente.nome}</h2>
              <p className="text-xs text-zinc-400">{agente.time}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Descrição */}
          <p className="text-sm text-zinc-500">{agente.descricao}</p>

          {/* Cliente selector (optional unless specified) */}
          {clientes.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Cliente <span className="text-zinc-400">(opcional — enriquece o contexto)</span>
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              >
                <option value="">Sem cliente selecionado</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Marca — aparece só quando o cliente tem marcas cadastradas.
              Obrigatória nesse caso, para o agente não misturar marcas irmãs. */}
          {marcas.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                Marca <span className="text-red-500">*</span>
              </label>
              <select
                value={marcaId}
                onChange={(e) => setMarcaId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
              >
                <option value="">Selecione a marca…</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                    {m.nivel === 'sub' ? ' (submarca)' : m.nivel === 'mae' ? ' (marca-mãe)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic inputs */}
          {agente.inputsSchema.map((field) => (
            <div key={field.chave}>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                {field.label}
                {field.obrigatorio && <span className="ml-1 text-red-500">*</span>}
              </label>
              {field.tipo === 'textarea' ? (
                <textarea
                  value={campos[field.chave] ?? ''}
                  onChange={(e) => handleCampo(field.chave, e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              ) : (
                <input
                  type={field.tipo === 'number' ? 'number' : 'text'}
                  value={campos[field.chave] ?? ''}
                  onChange={(e) => handleCampo(field.chave, e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              )}
            </div>
          ))}

          {erro && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">{erro}</p>
          )}

          {/* Output */}
          {output !== null && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-medium text-zinc-700">Output gerado</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopiar}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-zinc-500 transition hover:bg-zinc-200"
                >
                  {copiado ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700">
                  {output}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          {output === null ? (
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executando…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Executar agente
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
