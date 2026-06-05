'use client'

import { useState, useTransition } from 'react'
import { Upload, Trash2, Download, Eye, EyeOff, FileText, Image } from 'lucide-react'
import { actionUploadAtivoVisual, actionDeleteAtivoVisual } from './actions'
import type { AtivoVisual } from './actions'

interface Props {
  clienteId: string
  marcaId: string | null
  ativos: AtivoVisual[]
  podeEditar: boolean
}

const CATEGORIAS = [
  { value: 'logo', label: 'Logo', icon: '🎨' },
  { value: 'paleta', label: 'Paleta', icon: '🎨' },
  { value: 'tipografia', label: 'Tipografia', icon: 'Aa' },
  { value: 'elemento_grafico', label: 'Elementos Gráficos', icon: '✦' },
  { value: 'mockup', label: 'Mockups', icon: '📱' },
  { value: 'brand_guidelines', label: 'Brand Guidelines', icon: '📋' },
  { value: 'arquivo_fonte', label: 'Arquivos Fonte', icon: '🗂' },
]

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url)
}

export default function IdentidadeSection({ clienteId, marcaId, ativos, podeEditar }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [categoria, setCategoria] = useState('logo')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [notaUso, setNotaUso] = useState('')
  const [visivelCliente, setVisivelCliente] = useState(true)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState('')
  const [pending, startTransition] = useTransition()

  // Agrupar por categoria
  const porCategoria = new Map<string, AtivoVisual[]>()
  for (const a of ativos) {
    const lista = porCategoria.get(a.categoria) ?? []
    lista.push(a)
    porCategoria.set(a.categoria, lista)
  }

  function handleUpload() {
    if (arquivos.length === 0 || !nome) {
      setErro('Preencha o nome e selecione ao menos um arquivo.')
      return
    }
    setErro(null)

    startTransition(async () => {
      const multi = arquivos.length > 1
      let enviados = 0
      for (const arquivo of arquivos) {
        if (multi) setProgresso(`Enviando ${enviados + 1} de ${arquivos.length}…`)
        // Com vários arquivos (ex: família de fonte), cada um vira um ativo com
        // o nome da família + o nome do arquivo, para ficarem agrupados.
        const baseArq = arquivo.name.replace(/\.[^.]+$/, '')
        const nomeFinal = multi ? `${nome} — ${baseArq}` : nome

        const fd = new FormData()
        fd.append('file', arquivo)
        fd.append('categoria', categoria)
        fd.append('nome', nomeFinal)
        fd.append('descricao', descricao)
        fd.append('nota_uso', notaUso)
        fd.append('visivel_para_cliente', String(visivelCliente))
        if (marcaId) fd.append('marca_id', marcaId)

        const res = await actionUploadAtivoVisual(clienteId, fd)
        if (res.error) {
          setErro(`Erro no arquivo "${arquivo.name}": ${res.error}`)
          setProgresso('')
          return
        }
        enviados++
      }
      setProgresso('')
      setMostrarForm(false)
      setNome('')
      setDescricao('')
      setNotaUso('')
      setArquivos([])
    })
  }

  function handleDelete(ativoId: string) {
    startTransition(async () => {
      await actionDeleteAtivoVisual(ativoId, clienteId)
    })
  }

  return (
    <div className="space-y-6">
      {/* Formulário de upload */}
      {podeEditar && (
        <div>
          {!mostrarForm ? (
            <button
              onClick={() => setMostrarForm(true)}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 transition hover:border-brand/50 hover:text-brand"
            >
              <Upload className="h-4 w-4" />
              Adicionar ativo visual
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700">Novo ativo visual</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700">Nome <span className="text-red-500">*</span></label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Logo principal horizontal"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                  Arquivo(s) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
                  className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-300"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Pode selecionar vários de uma vez — ex: a família de fonte inteira (Regular, Bold, Italic…). Cada arquivo vira um ativo com o nome da família.
                </p>
                {arquivos.length > 1 && (
                  <p className="mt-1 text-[11px] text-zinc-500">{arquivos.length} arquivos selecionados</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Nota de uso (opcional)</label>
                <input
                  value={notaUso}
                  onChange={(e) => setNotaUso(e.target.value)}
                  placeholder="Use em fundos brancos e neutros. Nunca comprima."
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Descrição (opcional)</label>
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Versão horizontal para cabeçalhos e documentos"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="visivel-cliente"
                  type="checkbox"
                  checked={visivelCliente}
                  onChange={(e) => setVisivelCliente(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="visivel-cliente" className="text-xs text-zinc-600">
                  Visível para o cliente
                </label>
              </div>

              {erro && <p className="text-xs text-red-600">{erro}</p>}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpload}
                  disabled={pending}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {pending ? (progresso || 'Enviando…') : arquivos.length > 1 ? `Enviar ${arquivos.length} arquivos` : 'Fazer upload'}
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

      {/* Ativos agrupados por categoria */}
      {ativos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-8 text-center">
          <p className="text-sm text-zinc-400">Nenhum ativo visual cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIAS.filter((c) => porCategoria.has(c.value)).map((catInfo) => (
            <div key={catInfo.value}>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <span>{catInfo.icon}</span>
                {catInfo.label}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(porCategoria.get(catInfo.value) ?? []).map((ativo) => (
                  <AtivoCard
                    key={ativo.id}
                    ativo={ativo}
                    podeEditar={podeEditar}
                    onDelete={() => handleDelete(ativo.id)}
                    deletando={pending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AtivoCard
// ---------------------------------------------------------------------------

function AtivoCard({
  ativo,
  podeEditar,
  onDelete,
  deletando,
}: {
  ativo: AtivoVisual
  podeEditar: boolean
  onDelete: () => void
  deletando: boolean
}) {
  const ehImagem = isImage(ativo.url)

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {/* Preview */}
      {ehImagem && ativo.urlAssinada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ativo.urlAssinada}
          alt={ativo.nome}
          className="h-32 w-full object-contain bg-zinc-50 p-2"
        />
      ) : (
        <div className="flex h-20 items-center justify-center bg-zinc-50">
          {ativo.urlAssinada
            ? <FileText className="h-8 w-8 text-zinc-300" />
            : <Image className="h-8 w-8 text-zinc-300" />
          }
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-800">{ativo.nome}</p>
            {ativo.descricao && (
              <p className="mt-0.5 truncate text-[10px] text-zinc-400">{ativo.descricao}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!ativo.visivelParaCliente && (
              <span title="Não visível ao cliente"><EyeOff className="h-3 w-3 text-zinc-300" /></span>
            )}
            {ativo.visivelParaCliente && (
              <span title="Visível ao cliente"><Eye className="h-3 w-3 text-zinc-300" /></span>
            )}
          </div>
        </div>
        {ativo.notaUso && (
          <p className="mt-1.5 text-[10px] italic text-zinc-500 border-t border-zinc-100 pt-1.5">
            {ativo.notaUso}
          </p>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 border-t border-zinc-100 px-3 py-2">
        {ativo.urlAssinada && (
          <a
            href={ativo.urlAssinada}
            download={ativo.nome}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Download className="h-3 w-3" />
            Baixar
          </a>
        )}
        {podeEditar && (
          <button
            onClick={onDelete}
            disabled={deletando}
            className="flex items-center justify-center rounded-lg p-1.5 text-zinc-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
