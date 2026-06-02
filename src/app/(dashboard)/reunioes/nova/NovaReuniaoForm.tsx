'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Lock } from 'lucide-react'
import { actionCriarReuniao } from '../actions'
import type { TipoReuniao, ParticipanteExterno } from '../actions'
import type { PapelUsuario } from '@/types/database'

interface Props {
  perfis: { id: string; nome: string; papel: string }[]
  clientes: { id: string; nome: string }[]
  prospects: { id: string; nome: string }[]
  profileId: string
  papel: PapelUsuario
}

export function NovaReuniaoForm({ perfis, clientes, prospects, profileId, papel }: Props) {
  const router = useRouter()

  const [tipo, setTipo] = useState<TipoReuniao>('cliente')
  const [participantesInternos, setParticipantesInternos] = useState<string[]>([profileId])
  const [externos, setExternos] = useState<ParticipanteExterno[]>([])
  const [novoExterno, setNovoExterno] = useState<ParticipanteExterno>({ nome: '', empresa: '', email: '' })
  const [confidencial, setConfidencial] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const ehSocia = papel === 'socia'

  function toggleParticipante(id: string) {
    setParticipantesInternos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  function adicionarExterno() {
    if (!novoExterno.nome.trim()) return
    setExternos((prev) => [...prev, { ...novoExterno }])
    setNovoExterno({ nome: '', empresa: '', email: '' })
  }

  function removerExterno(i: number) {
    setExternos((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('participantes_internos', participantesInternos.join(','))
      formData.set('participantes_externos', JSON.stringify(externos))
      formData.set('confidencial', confidencial ? 'true' : 'false')

      const id = await actionCriarReuniao(formData)
      router.push(`/reunioes/${id}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar reunião')
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

      {/* Tipo + Data + Duração */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label-form">Tipo *</label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoReuniao)}
            className="input-form"
          >
            <option value="cliente">Cliente</option>
            <option value="prospeccao">Prospecção</option>
            <option value="interna">Interna</option>
            <option value="onboarding">Onboarding</option>
          </select>
        </div>
        <div>
          <label className="label-form">Data e hora *</label>
          <input
            name="data_reuniao"
            type="datetime-local"
            required
            className="input-form"
          />
        </div>
        <div>
          <label className="label-form">Duração (min)</label>
          <input
            name="duracao_minutos"
            type="number"
            min="15"
            step="15"
            placeholder="60"
            className="input-form"
          />
        </div>
      </div>

      {/* Assunto da reunião */}
      <div>
        <label className="label-form">
          Assunto {tipo === 'onboarding' ? <span className="text-zinc-400">(opcional — onboarding já é identificado)</span> : '*'}
        </label>
        <input
          name="assunto"
          type="text"
          required={tipo !== 'onboarding'}
          placeholder={tipo === 'onboarding'
            ? 'Ex: Kickoff de onboarding'
            : 'Ex: Alinhamento de campanha de junho'}
          className="input-form"
        />
      </div>

      {/* Contexto (cliente ou prospect) */}
      <div className="grid grid-cols-2 gap-4">
        {(tipo === 'cliente' || tipo === 'onboarding') && (
          <div>
            <label className="label-form">Cliente</label>
            <select name="cliente_id" className="input-form">
              <option value="">— Selecione —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}
        {tipo === 'prospeccao' && (
          <div>
            <label className="label-form">Prospect</label>
            <select name="prospect_id" className="input-form">
              <option value="">— Selecione —</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Participantes internos */}
      <div>
        <label className="label-form">Participantes internos</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {perfis.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleParticipante(p.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
                participantesInternos.includes(p.id)
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Participantes externos */}
      <div>
        <label className="label-form">Participantes externos</label>
        {externos.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {externos.map((ext, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-800">{ext.nome}</p>
                  {(ext.empresa || ext.email) && (
                    <p className="text-[10px] text-zinc-400">{[ext.empresa, ext.email].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <button type="button" onClick={() => removerExterno(i)} className="text-zinc-300 hover:text-red-400 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <input
            type="text"
            placeholder="Nome *"
            value={novoExterno.nome}
            onChange={(e) => setNovoExterno((p) => ({ ...p, nome: e.target.value }))}
            className="input-form text-xs"
          />
          <input
            type="text"
            placeholder="Empresa"
            value={novoExterno.empresa ?? ''}
            onChange={(e) => setNovoExterno((p) => ({ ...p, empresa: e.target.value }))}
            className="input-form text-xs"
          />
          <div className="flex gap-1">
            <input
              type="email"
              placeholder="E-mail"
              value={novoExterno.email ?? ''}
              onChange={(e) => setNovoExterno((p) => ({ ...p, email: e.target.value }))}
              className="input-form text-xs flex-1"
            />
            <button
              type="button"
              onClick={adicionarExterno}
              disabled={!novoExterno.nome.trim()}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-zinc-200 text-zinc-600 hover:bg-zinc-300 transition disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notas brutas */}
      {/* Link do Google Meet (Sprint 5.3) */}
      <div>
        <label className="label-form">Link do Google Meet <span className="text-zinc-400">(opcional)</span></label>
        <input
          name="meet_link"
          type="url"
          placeholder="https://meet.google.com/abc-defg-hij"
          className="input-form"
        />
        <p className="text-[10px] text-zinc-400 mt-1">
          Se a reunião for no Google Meet, cole o link para habilitar a importação automática das notas do Gemini.
        </p>
      </div>

      <div>
        <label className="label-form">Notas brutas</label>
        <textarea
          name="notas_brutas"
          rows={8}
          placeholder="Cole aqui as notas da reunião — qualquer formato funciona. A Izzi vai organizar tudo e extrair os action items automaticamente."
          className="input-form resize-none text-sm"
        />
        <p className="text-[10px] text-zinc-400 mt-1">
          Você pode adicionar ou editar as notas depois de salvar. O resumo e action items são gerados quando você solicitar.
        </p>
      </div>

      {/* Confidencial — só sócias */}
      {ehSocia && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 transition">
          <input
            type="checkbox"
            checked={confidencial}
            onChange={(e) => setConfidencial(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-400"
          />
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-sm font-medium text-zinc-700">Reunião confidencial</p>
              <p className="text-[11px] text-zinc-400">Visível apenas para sócias — oculta para atendimento e gestão</p>
            </div>
          </div>
        </label>
      )}

      {/* Erro */}
      {erro && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-600">
          {erro}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-none rounded-xl border border-zinc-200 px-5 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={carregando}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-60"
        >
          {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
          {carregando ? 'Salvando...' : 'Salvar Reunião'}
        </button>
      </div>
    </form>
  )
}
