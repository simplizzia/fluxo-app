'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { actionSalvarBlocoMestre } from '../../actions'

interface Bloco {
  paleta_hex: string[]
  regra_paleta: string | null
  estilo_luz: string | null
  sentimento_marca: string | null
  negativos_padrao: string[]
  formato_padrao: string
  estilo_geral: string | null
}

export function BlocoMestreForm({
  clienteId,
  bloco,
  readOnly,
}: {
  clienteId: string
  bloco: Bloco | null
  readOnly: boolean
}) {
  const [paleta, setPaleta] = useState((bloco?.paleta_hex ?? []).join(', '))
  const [regraPaleta, setRegraPaleta] = useState(bloco?.regra_paleta ?? '')
  const [estiloLuz, setEstiloLuz] = useState(bloco?.estilo_luz ?? '')
  const [sentimento, setSentimento] = useState(bloco?.sentimento_marca ?? '')
  const [negativos, setNegativos] = useState((bloco?.negativos_padrao ?? []).join('\n'))
  const [formato, setFormato] = useState(bloco?.formato_padrao ?? '4:5 vertical')
  const [estiloGeral, setEstiloGeral] = useState(bloco?.estilo_geral ?? '')
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [salvando, startSalvar] = useTransition()

  const paletaCores = paleta
    .split(',')
    .map((c) => c.trim())
    .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))

  function salvar() {
    startSalvar(async () => {
      const res = await actionSalvarBlocoMestre({
        clienteId,
        paleta_hex: paleta.split(',').map((c) => c.trim()).filter(Boolean),
        regra_paleta: regraPaleta,
        estilo_luz: estiloLuz,
        sentimento_marca: sentimento,
        negativos_padrao: negativos.split('\n').map((n) => n.trim()).filter(Boolean),
        formato_padrao: formato,
        estilo_geral: estiloGeral,
      })
      setMensagem(
        res.error
          ? { tipo: 'erro', texto: res.error }
          : { tipo: 'ok', texto: 'Bloco Mestre salvo.' },
      )
    })
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-500'
  const labelCls = 'mb-1 block text-xs font-semibold text-zinc-600'

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-bold text-ink">Bloco Mestre</h2>
        <p className="text-xs text-zinc-500">
          Regras fixas de estilo que entram em <strong>todo</strong> prompt deste cliente.
          {readOnly && ' Somente sócias e gestão editam — você está em modo leitura.'}
        </p>
      </div>

      {mensagem && (
        <p className={`rounded-xl px-3 py-2 text-sm ${mensagem.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {mensagem.texto}
        </p>
      )}

      <div>
        <label className={labelCls}>Paleta (hex, separados por vírgula)</label>
        <input value={paleta} onChange={(e) => setPaleta(e.target.value)} disabled={readOnly} className={inputCls} placeholder="#E60031, #F8B800, …" />
        {paletaCores.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {paletaCores.map((cor) => (
              <span key={cor} title={cor} className="h-6 w-6 rounded-lg border border-zinc-200" style={{ backgroundColor: cor }} />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>Regra de paleta</label>
        <textarea value={regraPaleta} onChange={(e) => setRegraPaleta(e.target.value)} disabled={readOnly} rows={2} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Estilo de luz</label>
        <textarea value={estiloLuz} onChange={(e) => setEstiloLuz(e.target.value)} disabled={readOnly} rows={2} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Sentimento da marca (o que É e o que NUNCA parece)</label>
        <textarea value={sentimento} onChange={(e) => setSentimento(e.target.value)} disabled={readOnly} rows={3} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Negativos padrão (um por linha)</label>
        <textarea value={negativos} onChange={(e) => setNegativos(e.target.value)} disabled={readOnly} rows={6} className={`${inputCls} font-mono text-xs`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Formato padrão</label>
          <input value={formato} onChange={(e) => setFormato(e.target.value)} disabled={readOnly} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Estilo geral</label>
        <textarea value={estiloGeral} onChange={(e) => setEstiloGeral(e.target.value)} disabled={readOnly} rows={2} className={inputCls} />
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando…' : 'Salvar Bloco Mestre'}
        </button>
      )}
    </div>
  )
}
