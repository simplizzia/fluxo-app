'use client'

import { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import { actionCriarCard, actionBuscarTipo } from '@/app/(dashboard)/board/actions'
import type { BoardCard } from '@/app/(dashboard)/board/actions'
import type { CampoFormulario, PapelUsuario } from '@/types/database'

interface TipoBasico {
  id: string
  nome: string
  categoria: string
}

interface ClienteBasico {
  id: string
  nome: string
}

interface ExecutorBasico {
  id: string
  nome: string
  papel: PapelUsuario
}

interface NewCardDialogProps {
  clientes: ClienteBasico[]
  tipos: TipoBasico[]
  executores: ExecutorBasico[]
  papelAtual: PapelUsuario
  onCardCriado: (card: BoardCard) => void
  onClose: () => void
}

const PRIORIDADES = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta', label: 'Alta' },
  { value: 'normal', label: 'Normal' },
  { value: 'baixa', label: 'Baixa' },
] as const

const CATEGORIA_LABELS: Record<string, string> = {
  redes_sociais: 'Redes Sociais',
  estrategia: 'Estratégia',
  embalagem: 'Embalagem',
  video: 'Vídeo',
  trafego: 'Tráfego Pago',
  linkedin: 'LinkedIn',
  email: 'Email Marketing',
  apresentacao: 'Apresentações',
  relatorio: 'Relatórios',
  outros: 'Outros',
}

export function NewCardDialog({
  clientes,
  tipos,
  executores,
  papelAtual,
  onCardCriado,
  onClose,
}: NewCardDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  // Campos do formulário dinâmico
  const [camposDinamicos, setCamposDinamicos] = useState<CampoFormulario[]>([])
  const [camposDinamicosPub, setCamposDinamicosPub] = useState<Record<string, string>>({})
  const [camposDinamicosInt, setCamposDinamicosInt] = useState<Record<string, string>>({})
  const [loadingTipo, setLoadingTipo] = useState(false)

  // Estado do select de tipo
  const [tipoSelecionado, setTipoSelecionado] = useState('')

  // Agrupar tipos por categoria para o optgroup
  const tiposPorCategoria = tipos.reduce<Record<string, TipoBasico[]>>((acc, t) => {
    const cat = t.categoria
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  // Quando o tipo muda, busca os campos_formulario
  useEffect(() => {
    if (!tipoSelecionado) {
      setCamposDinamicos([])
      setCamposDinamicosPub({})
      setCamposDinamicosInt({})
      return
    }
    setLoadingTipo(true)
    actionBuscarTipo(tipoSelecionado).then((result) => {
      setLoadingTipo(false)
      if (result.campos) {
        setCamposDinamicos(result.campos)
        // Resetar valores
        const pub: Record<string, string> = {}
        const int: Record<string, string> = {}
        result.campos.forEach((c) => {
          if (c.visivel_para_cliente) pub[c.nome] = ''
          else int[c.nome] = ''
        })
        setCamposDinamicosPub(pub)
        setCamposDinamicosInt(int)
      }
    })
  }, [tipoSelecionado])

  function handleDinamicoChange(campo: CampoFormulario, value: string) {
    if (campo.visivel_para_cliente) {
      setCamposDinamicosPub((prev) => ({ ...prev, [campo.nome]: value }))
    } else {
      setCamposDinamicosInt((prev) => ({ ...prev, [campo.nome]: value }))
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await actionCriarCard(formData, camposDinamicosPub, camposDinamicosInt)

      if (result.error) {
        setError(result.error)
        return
      }
      if (result.errors) {
        setFieldErrors(result.errors)
        return
      }
      if (result.card) {
        onCardCriado(result.card)
        onClose()
      }
    })
  }

  // Separar campos por visibilidade
  const camposCliente = camposDinamicos.filter((c) => c.visivel_para_cliente)
  const camposEquipe = camposDinamicos.filter((c) => !c.visivel_para_cliente)
  const ehEquipe = papelAtual !== 'cliente'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 z-10">
            <h2 className="text-base font-semibold text-zinc-900">Nova demanda</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Erro global */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Cliente + Tipo — grid 2 col */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="cliente_id" className="block text-sm font-medium text-zinc-700">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  id="cliente_id"
                  name="cliente_id"
                  required
                  disabled={isPending}
                  defaultValue=""
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                >
                  <option value="" disabled>Selecione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                {fieldErrors.cliente_id && (
                  <p className="text-xs text-red-600">{fieldErrors.cliente_id[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="tipo_id" className="block text-sm font-medium text-zinc-700">
                  Tipo de demanda <span className="text-red-500">*</span>
                </label>
                <select
                  id="tipo_id"
                  name="tipo_id"
                  required
                  disabled={isPending}
                  value={tipoSelecionado}
                  onChange={(e) => setTipoSelecionado(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                >
                  <option value="" disabled>Selecione…</option>
                  {Object.entries(tiposPorCategoria).map(([cat, tipos]) => (
                    <optgroup key={cat} label={CATEGORIA_LABELS[cat] ?? cat}>
                      {tipos.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {fieldErrors.tipo_id && (
                  <p className="text-xs text-red-600">{fieldErrors.tipo_id[0]}</p>
                )}
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="titulo" className="block text-sm font-medium text-zinc-700">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                id="titulo"
                name="titulo"
                type="text"
                required
                disabled={isPending}
                className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                placeholder="Descreva brevemente a demanda"
              />
              {fieldErrors.titulo && (
                <p className="text-xs text-red-600">{fieldErrors.titulo[0]}</p>
              )}
            </div>

            {/* Campos dinâmicos — carregando */}
            {loadingTipo && (
              <div className="py-4 text-center text-sm text-zinc-400">
                Carregando campos…
              </div>
            )}

            {/* Campos dinâmicos — visíveis ao cliente */}
            {!loadingTipo && camposCliente.length > 0 && (
              <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Informações da demanda
                </p>
                {camposCliente.map((campo) => (
                  <DynamicField
                    key={campo.nome}
                    campo={campo}
                    value={camposDinamicosPub[campo.nome] ?? ''}
                    onChange={(v) => handleDinamicoChange(campo, v)}
                    disabled={isPending}
                  />
                ))}
              </div>
            )}

            {/* Campos dinâmicos — internos (só equipe) */}
            {!loadingTipo && ehEquipe && camposEquipe.length > 0 && (
              <div className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Informações internas
                </p>
                {camposEquipe.map((campo) => (
                  <DynamicField
                    key={campo.nome}
                    campo={campo}
                    value={camposDinamicosInt[campo.nome] ?? ''}
                    onChange={(v) => handleDinamicoChange(campo, v)}
                    disabled={isPending}
                  />
                ))}
              </div>
            )}

            {/* Prioridade + Prazo + Responsável */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="prioridade" className="block text-sm font-medium text-zinc-700">
                  Prioridade
                </label>
                <select
                  id="prioridade"
                  name="prioridade"
                  disabled={isPending}
                  defaultValue="normal"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prazo_cliente" className="block text-sm font-medium text-zinc-700">
                  Prazo
                </label>
                <input
                  id="prazo_cliente"
                  name="prazo_cliente"
                  type="date"
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                />
              </div>

              {ehEquipe && (
                <div className="space-y-1.5">
                  <label htmlFor="responsavel_id" className="block text-sm font-medium text-zinc-700">
                    Responsável
                  </label>
                  <select
                    id="responsavel_id"
                    name="responsavel_id"
                    disabled={isPending}
                    defaultValue=""
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
                  >
                    <option value="">— Sem responsável</option>
                    {executores.map((e) => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Confidencial — só equipe sócia/gestao */}
            {(papelAtual === 'socia' || papelAtual === 'gestao') && (
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="confidencial"
                  value="true"
                  disabled={isPending}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                />
                <span className="text-sm text-zinc-700">
                  Marcar como confidencial
                  <span className="ml-1 text-xs text-zinc-400">
                    (visível somente para sócias)
                  </span>
                </span>
              </label>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !tipoSelecionado}
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? 'Criando…' : 'Criar demanda'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// DynamicField — renderiza o campo correto baseado no tipo
// ---------------------------------------------------------------------------

function DynamicField({
  campo,
  value,
  onChange,
  disabled,
}: {
  campo: CampoFormulario
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const label = (
    <label className="block text-sm font-medium text-zinc-700">
      {campo.rotulo}
      {campo.obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  )

  const baseClass =
    'w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50'

  switch (campo.tipo) {
    case 'textarea':
      return (
        <div className="space-y-1.5">
          {label}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={campo.obrigatorio}
            rows={3}
            placeholder={campo.placeholder}
            className={`${baseClass} resize-none`}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-1.5">
          {label}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={campo.obrigatorio}
            className={baseClass}
          >
            <option value="">Selecione…</option>
            {campo.opcoes?.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={campo.obrigatorio}
            placeholder={campo.placeholder}
            className={baseClass}
          />
        </div>
      )

    case 'date':
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={campo.obrigatorio}
            className={baseClass}
          />
        </div>
      )

    case 'month':
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="month"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={campo.obrigatorio}
            className={baseClass}
          />
        </div>
      )

    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            disabled={disabled}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          <span className="text-sm text-zinc-700">{campo.rotulo}</span>
        </label>
      )

    default: // 'text' e fallback
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={campo.obrigatorio}
            placeholder={campo.placeholder}
            className={baseClass}
          />
        </div>
      )
  }
}
