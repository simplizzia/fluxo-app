'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Globe, Plus, Trash2, GripVertical, Sparkles,
  Eye, EyeOff, Upload, Image as ImageIcon, CheckCircle2,
} from 'lucide-react'
import {
  actionSalvarSlide,
  actionAdicionarSlide,
  actionRemoverSlide,
  actionPublicarApresentacao,
  actionArquivarApresentacao,
  actionUploadSlideImagem,
  actionCarregarLogoCliente,
  actionGerarSlidesComIA,
  actionGetSignedUrl,
  type Apresentacao,
  type Slide,
  type TipoSlide,
  type SlideConteudo,
} from '../../apresentacao-actions'

interface Props {
  clienteId: string
  apresentacao: Apresentacao
  podeEditar: boolean
  appUrl: string
}

const TIPOS_SLIDE: { tipo: TipoSlide; label: string; desc: string }[] = [
  { tipo: 'capa',          label: 'Capa',           desc: 'Título principal + subtítulo' },
  { tipo: 'titulo_secao',  label: 'Seção',          desc: 'Divisão entre partes' },
  { tipo: 'texto',         label: 'Texto',          desc: 'Título + corpo em markdown' },
  { tipo: 'imagem',        label: 'Imagem',         desc: 'Imagem com legenda' },
  { tipo: 'texto_imagem',  label: 'Texto + Imagem', desc: 'Lado a lado' },
  { tipo: 'metricas',      label: 'Métricas',       desc: 'Números em destaque' },
  { tipo: 'citacao',       label: 'Citação',        desc: 'Quote com autor' },
]

const TIPO_LABEL: Record<TipoSlide, string> = {
  capa: 'Capa', titulo_secao: 'Seção', texto: 'Texto',
  imagem: 'Imagem', texto_imagem: 'Texto+Img', metricas: 'Métricas', citacao: 'Citação',
}

export default function ApresentacaoEditorClient({ clienteId, apresentacao, podeEditar, appUrl }: Props) {
  const [slides, setSlides] = useState<Slide[]>(apresentacao.slides ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(slides[0]?.id ?? null)
  const [status, setStatus] = useState(apresentacao.status)
  const [adicionando, setAdicionando] = useState(false)
  const [pubPending, startPub] = useTransition()
  const [iaPending, startIA] = useTransition()
  const [iaOk, setIaOk] = useState(false)
  const [iaErro, setIaErro] = useState('')
  const [logoPending, startLogo] = useTransition()

  const urlPublica = `${appUrl}/apresentacoes/${apresentacao.token}`
  const selectedSlide = slides.find((s) => s.id === selectedId) ?? null

  function handleSlideSaved(updated: Slide) {
    setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  function handleSlideAdded(novo: Slide) {
    setSlides((prev) => [...prev, novo])
    setSelectedId(novo.id)
    setAdicionando(false)
  }

  function handleSlideRemoved(id: string) {
    const restantes = slides.filter((s) => s.id !== id)
    setSlides(restantes)
    if (selectedId === id) setSelectedId(restantes[0]?.id ?? null)
  }

  function handlePublicar() {
    startPub(async () => {
      const res = status === 'publicada'
        ? await actionArquivarApresentacao(apresentacao.id, clienteId)
        : await actionPublicarApresentacao(apresentacao.id, clienteId)
      if (!res.error) setStatus(status === 'publicada' ? 'arquivada' : 'publicada')
    })
  }

  function handleGerarIA() {
    setIaErro('')
    setIaOk(false)
    startIA(async () => {
      const res = await actionGerarSlidesComIA(apresentacao.id, clienteId)
      if (res.error) { setIaErro(res.error); return }
      // Recarrega slides da página
      setIaOk(true)
      setTimeout(() => window.location.reload(), 1500)
    })
  }

  function handleCarregarLogo() {
    if (!selectedSlide || (selectedSlide.tipo !== 'capa')) return
    startLogo(async () => {
      const res = await actionCarregarLogoCliente(clienteId)
      if (res.storagePath) {
        handleSlideSaved({ ...selectedSlide, conteudo: { ...selectedSlide.conteudo, logo_url: res.storagePath } })
      }
    })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-none items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <Link
          href={`/clientes/${clienteId}`}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="h-4 w-px bg-zinc-200" />
        <h1 className="flex-1 truncate text-sm font-semibold text-zinc-800">{apresentacao.titulo}</h1>

        <div className="flex items-center gap-2">
          {iaErro && <span className="text-xs text-red-500">{iaErro}</span>}
          {iaOk && <span className="text-xs text-green-600">✓ Slides gerados! Recarregando...</span>}

          {podeEditar && (
            <button
              onClick={handleGerarIA}
              disabled={iaPending}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand/30 hover:text-brand disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {iaPending ? 'Gerando...' : 'Gerar com Izzi'}
            </button>
          )}

          {status === 'publicada' && (
            <a
              href={urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700"
            >
              <Globe className="h-3.5 w-3.5" />
              Ver link público
            </a>
          )}

          {podeEditar && (
            <button
              onClick={handlePublicar}
              disabled={pubPending}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                status === 'publicada'
                  ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-gradient-brand text-white'
              }`}
            >
              {status === 'publicada' ? (
                <><EyeOff className="h-3.5 w-3.5" />{pubPending ? '...' : 'Arquivar'}</>
              ) : (
                <><Eye className="h-3.5 w-3.5" />{pubPending ? '...' : 'Publicar'}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body: painel de slides + editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lista de slides */}
        <aside className="flex w-52 flex-none flex-col border-r border-zinc-200 bg-zinc-50 overflow-y-auto">
          <div className="p-3 space-y-1">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                  selectedId === s.id
                    ? 'bg-white shadow-sm text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:bg-white/60'
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 flex-none text-zinc-300" />
                <span className="flex-1 truncate">
                  <span className="mr-1 text-zinc-300">{i + 1}.</span>
                  {TIPO_LABEL[s.tipo]}
                  {s.conteudo.titulo && (
                    <span className="ml-1 text-[10px] text-zinc-400 truncate block">
                      {s.conteudo.titulo}
                    </span>
                  )}
                </span>
              </button>
            ))}

            {/* Adicionar slide */}
            {podeEditar && !adicionando && (
              <button
                onClick={() => setAdicionando(true)}
                className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-2.5 py-2 text-xs text-zinc-400 hover:border-brand/40 hover:text-brand"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar slide
              </button>
            )}

            {adicionando && (
              <AddSlidePanel
                apresentacaoId={apresentacao.id}
                clienteId={clienteId}
                onAdded={handleSlideAdded}
                onCancel={() => setAdicionando(false)}
              />
            )}
          </div>
        </aside>

        {/* Editor do slide selecionado */}
        <main className="flex-1 overflow-y-auto bg-white p-6">
          {selectedSlide ? (
            <SlideEditor
              key={selectedSlide.id}
              slide={selectedSlide}
              clienteId={clienteId}
              podeEditar={podeEditar}
              onSaved={handleSlideSaved}
              onRemoved={() => handleSlideRemoved(selectedSlide.id)}
              onCarregarLogo={selectedSlide.tipo === 'capa' ? handleCarregarLogo : undefined}
              logoPending={logoPending}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-zinc-400">Selecione ou adicione um slide.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddSlidePanel — escolha de tipo para novo slide
// ---------------------------------------------------------------------------

function AddSlidePanel({
  apresentacaoId,
  clienteId,
  onAdded,
  onCancel,
}: {
  apresentacaoId: string
  clienteId: string
  onAdded: (s: Slide) => void
  onCancel: () => void
}) {
  const [pending, start] = useTransition()

  function handleAdd(tipo: TipoSlide) {
    start(async () => {
      const res = await actionAdicionarSlide(apresentacaoId, tipo, clienteId)
      if (res.data) onAdded(res.data)
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Tipo de slide</p>
      {TIPOS_SLIDE.map((t) => (
        <button
          key={t.tipo}
          onClick={() => handleAdd(t.tipo)}
          disabled={pending}
          className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50 disabled:opacity-50"
        >
          <span className="text-xs font-medium text-zinc-700">{t.label}</span>
          <span className="text-[10px] text-zinc-400">{t.desc}</span>
        </button>
      ))}
      <button
        onClick={onCancel}
        className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
      >
        Cancelar
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SlideEditor — formulário adaptado ao tipo do slide
// ---------------------------------------------------------------------------

function SlideEditor({
  slide,
  clienteId,
  podeEditar,
  onSaved,
  onRemoved,
  onCarregarLogo,
  logoPending,
}: {
  slide: Slide
  clienteId: string
  podeEditar: boolean
  onSaved: (s: Slide) => void
  onRemoved: () => void
  onCarregarLogo?: () => void
  logoPending?: boolean
}) {
  const [conteudo, setConteudo] = useState<SlideConteudo>(slide.conteudo)
  const [savePending, startSave] = useTransition()
  const [removePending, startRemove] = useTransition()
  const [uploadPending, startUpload] = useTransition()
  const [savedOk, setSavedOk] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  function campo(field: keyof SlideConteudo) {
    return (v: string) => setConteudo((c) => ({ ...c, [field]: v }))
  }

  function handleSave() {
    startSave(async () => {
      await actionSalvarSlide(slide.id, conteudo, clienteId)
      onSaved({ ...slide, conteudo })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 1500)
    })
  }

  function handleRemove() {
    startRemove(async () => {
      await actionRemoverSlide(slide.id, clienteId)
      onRemoved()
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'imagem_url' | 'imagem_fundo_url') {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startUpload(async () => {
      const res = await actionUploadSlideImagem(clienteId, fd)
      if (res.url) {
        setConteudo((c) => ({ ...c, [field]: res.url }))
        // Gera signed URL para preview
        const signed = await actionGetSignedUrl(res.url!)
        if (signed.url) setUploadedUrl(signed.url)
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">
          Editando: <span className="text-brand">{TIPO_LABEL[slide.tipo]}</span>
        </h2>
        {podeEditar && !confirmRemove && (
          <button
            onClick={() => setConfirmRemove(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover slide
          </button>
        )}
        {confirmRemove && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Remover este slide?</span>
            <button
              onClick={handleRemove}
              disabled={removePending}
              className="rounded-lg px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {removePending ? '...' : 'Sim'}
            </button>
            <button onClick={() => setConfirmRemove(false)} className="rounded-lg px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100">
              Não
            </button>
          </div>
        )}
      </div>

      {/* Campos por tipo */}
      {(slide.tipo === 'capa') && (
        <div className="space-y-4">
          <F label="Título principal" value={conteudo.titulo ?? ''} onChange={campo('titulo')} disabled={!podeEditar} />
          <F label="Subtítulo" value={conteudo.subtitulo ?? ''} onChange={campo('subtitulo')} disabled={!podeEditar} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Logo do cliente</label>
            <div className="flex items-center gap-2">
              {conteudo.logo_url && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              <button
                type="button"
                onClick={onCarregarLogo}
                disabled={logoPending}
                className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                {logoPending ? 'Carregando...' : conteudo.logo_url ? 'Trocar logo' : 'Carregar logo do cliente'}
              </button>
              <span className="text-[10px] text-zinc-400">(puxado de Identidade Visual)</span>
            </div>
          </div>
          <ImageUploadField
            label="Imagem de fundo (opcional)"
            field="imagem_fundo_url"
            value={conteudo.imagem_fundo_url}
            uploadedUrl={uploadedUrl}
            onUpload={handleImageUpload}
            uploadPending={uploadPending}
            disabled={!podeEditar}
          />
        </div>
      )}

      {slide.tipo === 'titulo_secao' && (
        <div className="space-y-4">
          <F label="Título da seção" value={conteudo.titulo ?? ''} onChange={campo('titulo')} disabled={!podeEditar} />
          <F label="Descrição" value={conteudo.descricao ?? ''} onChange={campo('descricao')} disabled={!podeEditar} />
          <F
            label="Número da seção"
            value={String(conteudo.numero_secao ?? '')}
            onChange={(v) => setConteudo((c) => ({ ...c, numero_secao: Number(v) || undefined }))}
            type="number"
            disabled={!podeEditar}
          />
        </div>
      )}

      {slide.tipo === 'texto' && (
        <div className="space-y-4">
          <F label="Título" value={conteudo.titulo ?? ''} onChange={campo('titulo')} disabled={!podeEditar} />
          <FTextarea label="Corpo (suporta **negrito** e - listas)" value={conteudo.corpo ?? ''} onChange={campo('corpo')} rows={8} disabled={!podeEditar} />
        </div>
      )}

      {slide.tipo === 'imagem' && (
        <div className="space-y-4">
          <F label="Título" value={conteudo.titulo ?? ''} onChange={campo('titulo')} disabled={!podeEditar} />
          <ImageUploadField
            label="Imagem"
            field="imagem_url"
            value={conteudo.imagem_url}
            uploadedUrl={uploadedUrl}
            onUpload={handleImageUpload}
            uploadPending={uploadPending}
            disabled={!podeEditar}
          />
          <F label="Legenda" value={conteudo.legenda ?? ''} onChange={campo('legenda')} disabled={!podeEditar} />
        </div>
      )}

      {slide.tipo === 'texto_imagem' && (
        <div className="space-y-4">
          <F label="Título" value={conteudo.titulo ?? ''} onChange={campo('titulo')} disabled={!podeEditar} />
          <FTextarea label="Corpo" value={conteudo.corpo ?? ''} onChange={campo('corpo')} rows={6} disabled={!podeEditar} />
          <ImageUploadField
            label="Imagem"
            field="imagem_url"
            value={conteudo.imagem_url}
            uploadedUrl={uploadedUrl}
            onUpload={handleImageUpload}
            uploadPending={uploadPending}
            disabled={!podeEditar}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Posição da imagem</label>
            <div className="flex gap-2">
              {(['esquerda', 'direita'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConteudo((c) => ({ ...c, posicao: p }))}
                  disabled={!podeEditar}
                  className={`rounded-xl border px-3 py-1.5 text-xs capitalize transition ${
                    conteudo.posicao === p
                      ? 'border-brand bg-brand-light text-brand'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {slide.tipo === 'metricas' && (
        <div className="space-y-4">
          <F label="Título" value={conteudo.titulo ?? ''} onChange={campo('titulo')} disabled={!podeEditar} />
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-600">Métricas</label>
            {(conteudo.items ?? []).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={item.valor}
                  onChange={(e) => {
                    const items = [...(conteudo.items ?? [])]
                    items[i] = { ...items[i], valor: e.target.value }
                    setConteudo((c) => ({ ...c, items }))
                  }}
                  placeholder="Valor (ex: 12k)"
                  disabled={!podeEditar}
                  className="w-28 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold outline-none focus:border-brand/40"
                />
                <input
                  value={item.label}
                  onChange={(e) => {
                    const items = [...(conteudo.items ?? [])]
                    items[i] = { ...items[i], label: e.target.value }
                    setConteudo((c) => ({ ...c, items }))
                  }}
                  placeholder="Rótulo (ex: seguidores)"
                  disabled={!podeEditar}
                  className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40"
                />
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => {
                      const items = (conteudo.items ?? []).filter((_, j) => j !== i)
                      setConteudo((c) => ({ ...c, items }))
                    }}
                    className="rounded-lg p-1 text-zinc-300 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {podeEditar && (
              <button
                type="button"
                onClick={() => setConteudo((c) => ({ ...c, items: [...(c.items ?? []), { valor: '', label: '' }] }))}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-brand"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar métrica
              </button>
            )}
          </div>
        </div>
      )}

      {slide.tipo === 'citacao' && (
        <div className="space-y-4">
          <FTextarea label="Texto da citação" value={conteudo.texto ?? ''} onChange={campo('texto')} rows={4} disabled={!podeEditar} />
          <F label="Autor" value={conteudo.autor ?? ''} onChange={campo('autor')} disabled={!podeEditar} />
          <F label="Cargo" value={conteudo.cargo ?? ''} onChange={campo('cargo')} disabled={!podeEditar} />
        </div>
      )}

      {podeEditar && (
        <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
          <button
            onClick={handleSave}
            disabled={savePending}
            className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {savedOk ? '✓ Salvo' : savePending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers de formulário
// ---------------------------------------------------------------------------

function F({ label, value, onChange, placeholder, type = 'text', disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:bg-zinc-50"
      />
    </div>
  )
}

function FTextarea({ label, value, onChange, rows = 4, disabled }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:bg-zinc-50"
      />
    </div>
  )
}

function ImageUploadField({ label, field, value, uploadedUrl, onUpload, uploadPending, disabled }: {
  label: string
  field: 'imagem_url' | 'imagem_fundo_url'
  value?: string
  uploadedUrl?: string | null
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'imagem_url' | 'imagem_fundo_url') => void
  uploadPending?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      {(value || uploadedUrl) && (
        <div className="mb-2 overflow-hidden rounded-xl border border-zinc-200">
          {uploadedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploadedUrl} alt="preview" className="h-32 w-full object-cover" />
          ) : (
            <div className="flex h-20 items-center justify-center bg-zinc-50">
              <ImageIcon className="h-6 w-6 text-zinc-300" />
              <span className="ml-2 text-xs text-zinc-400 truncate max-w-xs">{value}</span>
            </div>
          )}
        </div>
      )}
      {!disabled && (
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:border-brand/40 hover:text-brand ${uploadPending ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="h-3.5 w-3.5" />
          {uploadPending ? 'Enviando...' : 'Selecionar imagem'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e, field)}
          />
        </label>
      )}
    </div>
  )
}
