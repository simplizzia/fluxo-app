'use client'

import { useState, useTransition, useRef } from 'react'
import { Megaphone, Plus, Eye, Trash2, Clock, CheckCircle2, X, Image as ImageIcon, Link } from 'lucide-react'
import type { AvisoEquipe } from '@/app/(dashboard)/socias/pessoas/actions'
import { actionPublicarAviso, actionExcluirAviso } from '@/app/(dashboard)/socias/pessoas/actions'

interface Props {
  avisos: AvisoEquipe[]
  perfisEquipe: { id: string; nome: string; papel: string }[]
}

export function AbaAvisos({ avisos, perfisEquipe }: Props) {
  const [mostraForm, setMostraForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [destinatarios, setDestinatarios] = useState<'todos' | 'ativos' | 'especificos'>('todos')
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [agendadoPara, setAgendadoPara] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setTitulo(''); setConteudo(''); setLinkUrl(''); setLinkLabel('')
    setDestinatarios('todos'); setSelecionados([]); setAgendadoPara('')
    setErro(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !conteudo.trim()) { setErro('Título e conteúdo são obrigatórios.'); return }
    setErro(null)

    const fd = new FormData(e.target as HTMLFormElement)
    fd.set('destinatarios', destinatarios)
    fd.set('parceiro_ids', JSON.stringify(destinatarios === 'especificos' ? selecionados : []))
    if (fileRef.current?.files?.[0]) fd.set('imagem', fileRef.current.files[0])

    startTransition(async () => {
      try {
        await actionPublicarAviso(fd)
        resetForm()
        setMostraForm(false)
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao publicar aviso.')
      }
    })
  }

  function excluir(id: string) {
    startTransition(async () => {
      await actionExcluirAviso(id)
      setConfirmExcluir(null)
    })
  }

  const publicados = avisos.filter((a) => a.publicado_em)
  const agendados = avisos.filter((a) => !a.publicado_em && a.agendado_para)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {publicados.length} publicado(s) · {agendados.length} agendado(s)
        </p>
        <button
          onClick={() => { resetForm(); setMostraForm(!mostraForm) }}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo aviso
        </button>
      </div>

      {/* Form */}
      {mostraForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-800">Criar aviso</p>
            <button type="button" onClick={() => setMostraForm(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Título *</label>
            <input
              name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              required placeholder="Ex: Atualização importante da equipe"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Conteúdo *</label>
            <textarea
              name="conteudo" value={conteudo} onChange={(e) => setConteudo(e.target.value)}
              required rows={4} placeholder="Mensagem para a equipe... Suporta **negrito** e quebras de linha."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
            />
          </div>

          {/* Imagem e link */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Imagem (opcional)
              </label>
              <input
                ref={fileRef} type="file" accept="image/*"
                className="w-full text-xs text-zinc-500 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-100 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-violet-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center gap-1">
                <Link className="h-3 w-3" /> Link (opcional)
              </label>
              <input
                name="link_url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                type="url" placeholder="https://..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              {linkUrl && (
                <input
                  name="link_label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Texto do botão"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Destinatários */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Destinatários</label>
            <div className="flex gap-2">
              {(['todos', 'ativos', 'especificos'] as const).map((d) => (
                <button
                  key={d} type="button" onClick={() => setDestinatarios(d)}
                  className={[
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition border',
                    destinatarios === d
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300',
                  ].join(' ')}
                >
                  {d === 'todos' ? 'Todos' : d === 'ativos' ? 'Somente ativos' : 'Específicos'}
                </button>
              ))}
            </div>
            {destinatarios === 'especificos' && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 space-y-1">
                {perfisEquipe.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(p.id)}
                      onChange={(e) =>
                        setSelecionados(e.target.checked
                          ? [...selecionados, p.id]
                          : selecionados.filter((s) => s !== p.id))
                      }
                      className="rounded border-zinc-300 text-violet-600"
                    />
                    <span className="text-xs text-zinc-700">{p.nome}</span>
                    <span className="text-[10px] text-zinc-400">{p.papel}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Agendamento */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Agendar para (opcional — vazio = publicar agora)
            </label>
            <input
              name="agendado_para"
              type="datetime-local"
              value={agendadoPara}
              onChange={(e) => setAgendadoPara(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none"
            />
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2">
            <button
              type="submit" disabled={isPending}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {isPending ? 'Publicando...' : agendadoPara ? '📅 Agendar aviso' : '📣 Publicar agora'}
            </button>
            <button
              type="button" onClick={() => setMostraForm(false)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de avisos */}
      {avisos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Megaphone className="mb-3 h-9 w-9 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">Nenhum aviso criado ainda.</p>
          <p className="mt-1 text-xs text-zinc-400">Crie um aviso para aparecer como popup para a equipe.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {avisos.map((a) => (
            <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.imagem_url && <img src={a.imagem_url} alt={a.titulo} className="h-12 w-12 rounded-lg object-cover flex-none" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.publicado_em ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {a.publicado_em
                        ? <><CheckCircle2 className="h-3 w-3" /> Publicado</>
                        : <><Clock className="h-3 w-3" /> Agendado</>
                      }
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {a.destinatarios === 'todos' ? '→ Todos'
                        : a.destinatarios === 'ativos' ? '→ Ativos'
                        : `→ ${a.parceiro_ids.length} específico(s)`}
                    </span>
                    {a.total_visualizacoes != null && (
                      <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                        <Eye className="h-3 w-3" /> {a.total_visualizacoes} leitura(s)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{a.titulo}</p>
                  <p className="text-xs text-zinc-500 line-clamp-2">{a.conteudo}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    por {a.criado_por_nome ?? '—'} ·{' '}
                    {a.publicado_em
                      ? new Date(a.publicado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : `Agendado p/ ${new Date(a.agendado_para!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
                  </p>
                </div>
                {/* Excluir */}
                {confirmExcluir === a.id ? (
                  <div className="flex gap-1.5 flex-none">
                    <button
                      onClick={() => excluir(a.id)} disabled={isPending}
                      className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmExcluir(null)}
                      className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-700 transition"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmExcluir(a.id)}
                    className="flex-none rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition"
                    title="Excluir aviso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
