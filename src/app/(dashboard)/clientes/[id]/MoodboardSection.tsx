'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Link2, Palette, Type, AlertTriangle } from 'lucide-react'
import { actionAddMoodboardItem, actionDeleteMoodboardItem } from './actions'
import type { MoodboardItem } from './actions'

interface Props {
  clienteId: string
  marcaId: string | null
  items: MoodboardItem[]
  podeEditar: boolean
}

const SECOES = [
  { value: 'fotografia', label: 'Fotografia' },
  { value: 'tipografia', label: 'Tipografia' },
  { value: 'cor', label: 'Cor' },
  { value: 'textura', label: 'Textura' },
  { value: 'referencia_marca', label: 'Referências de Marca' },
  { value: 'geral', label: 'Geral' },
]

const TIPO_ICONS: Record<string, React.ReactNode> = {
  link_externo: <Link2 className="h-3 w-3" />,
  cor: <Palette className="h-3 w-3" />,
  texto: <Type className="h-3 w-3" />,
}

export default function MoodboardSection({ clienteId, marcaId, items, podeEditar }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [tipo, setTipo] = useState('link_externo')
  const [secao, setSecao] = useState('geral')
  const [url, setUrl] = useState('')
  const [corHex, setCorHex] = useState('#A046C6')
  const [texto, setTexto] = useState('')
  const [nota, setNota] = useState('')
  const [antiRef, setAntiRef] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const secoesCom = SECOES.filter((s) => items.some((i) => i.secao === s.value))
  const secoesVisiveis = secoesCom.length > 0 ? secoesCom : SECOES.slice(0, 1)

  function handleAdd() {
    setErro(null)
    const opts = {
      clienteId,
      marcaId,
      secao,
      tipo,
      url: tipo === 'link_externo' ? url : undefined,
      corHex: tipo === 'cor' ? corHex : undefined,
      texto: tipo === 'texto' ? texto : undefined,
      nota: nota || undefined,
      antiReferencia: antiRef,
    }
    startTransition(async () => {
      const res = await actionAddMoodboardItem(opts)
      if (res.error) {
        setErro(res.error)
      } else {
        setMostrarForm(false)
        setUrl('')
        setNota('')
        setTexto('')
        setAntiRef(false)
      }
    })
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      await actionDeleteMoodboardItem(itemId, clienteId)
    })
  }

  return (
    <div className="space-y-6">
      {/* Botão adicionar */}
      {podeEditar && (
        <div>
          {!mostrarForm ? (
            <button
              onClick={() => setMostrarForm(true)}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 transition hover:border-brand/50 hover:text-brand"
            >
              <Plus className="h-4 w-4" />
              Adicionar item
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  >
                    <option value="link_externo">Link externo</option>
                    <option value="cor">Cor</option>
                    <option value="texto">Texto / mood words</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">Seção</label>
                  <select
                    value={secao}
                    onChange={(e) => setSecao(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  >
                    {SECOES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {tipo === 'link_externo' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">URL (Pinterest, Behance, etc.)</label>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.pinterest.com/pin/..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              )}

              {tipo === 'cor' && (
                <div className="flex items-center gap-4">
                  <label className="text-xs font-medium text-zinc-700">Cor</label>
                  <input
                    type="color"
                    value={corHex}
                    onChange={(e) => setCorHex(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded-xl border border-zinc-200"
                  />
                  <span className="font-mono text-sm text-zinc-500">{corHex}</span>
                </div>
              )}

              {tipo === 'texto' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">Mood words / texto</label>
                  <input
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="quente · artesanal · vibrante · preciso"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Nota contextual (opcional)</label>
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="A luz aqui é o que buscamos — difusa, quente, nunca direta"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="anti-ref"
                  type="checkbox"
                  checked={antiRef}
                  onChange={(e) => setAntiRef(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="anti-ref" className="text-xs text-zinc-600">
                  Anti-referência — o cliente explicitamente não quer isso
                </label>
              </div>

              {erro && <p className="text-xs text-red-600">{erro}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={pending}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {pending ? 'Adicionando…' : 'Adicionar'}
                </button>
                <button
                  onClick={() => { setMostrarForm(false); setErro(null) }}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid por seção */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-8 text-center">
          <p className="text-sm text-zinc-400">Nenhum item no moodboard ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {SECOES.filter((s) => items.some((i) => i.secao === s.value)).map((secaoInfo) => {
            const itemsSecao = items.filter((i) => i.secao === secaoInfo.value)
            return (
              <div key={secaoInfo.value}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {secaoInfo.label}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {itemsSecao.map((item) => (
                    <MoodboardCard
                      key={item.id}
                      item={item}
                      podeEditar={podeEditar}
                      onDelete={() => handleDelete(item.id)}
                      deletando={pending}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MoodboardCard
// ---------------------------------------------------------------------------

function MoodboardCard({
  item,
  podeEditar,
  onDelete,
  deletando,
}: {
  item: MoodboardItem
  podeEditar: boolean
  onDelete: () => void
  deletando: boolean
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition ${
        item.antiReferencia
          ? 'border-red-200 bg-red-50'
          : 'border-zinc-200 bg-white'
      }`}
    >
      {/* Anti-referência badge */}
      {item.antiReferencia && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
          <AlertTriangle className="h-2.5 w-2.5" />
          Anti-ref
        </div>
      )}

      {/* Conteúdo do item */}
      {item.tipo === 'link_externo' && (
        <div className="flex min-h-[80px] flex-col items-center justify-center gap-2 p-4">
          <Link2 className="h-5 w-5 text-zinc-400" />
          <a
            href={item.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-center text-xs text-brand hover:underline"
          >
            {item.url?.replace(/^https?:\/\//, '').split('/')[0]}
          </a>
        </div>
      )}

      {item.tipo === 'cor' && item.corHex && (
        <div>
          <div
            className="h-16 w-full"
            style={{ backgroundColor: item.corHex }}
          />
          <div className="p-2 text-center font-mono text-xs font-semibold text-zinc-700">
            {item.corHex}
          </div>
        </div>
      )}

      {item.tipo === 'texto' && (
        <div className="flex min-h-[80px] items-center justify-center p-4">
          <p className="text-center text-sm font-medium italic text-zinc-700">"{item.texto}"</p>
        </div>
      )}

      {/* Nota */}
      {item.nota && (
        <div className="border-t border-zinc-100 px-3 pb-3 pt-2">
          <p className="text-[11px] italic text-zinc-500">{item.nota}</p>
        </div>
      )}

      {/* Tipo badge */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400">
        {TIPO_ICONS[item.tipo]}
      </div>

      {/* Delete */}
      {podeEditar && (
        <button
          onClick={onDelete}
          disabled={deletando}
          className="absolute right-2 top-2 hidden rounded-lg bg-white/80 p-1 text-zinc-400 shadow-sm transition hover:bg-red-50 hover:text-red-600 group-hover:flex"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
