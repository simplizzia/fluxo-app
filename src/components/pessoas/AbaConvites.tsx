'use client'

import { useState, useTransition } from 'react'
import { Mail, Plus, Clock, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'
import type { OnboardingToken } from '@/app/(dashboard)/socias/pessoas/actions'
import { actionConvidarParceiro } from '@/app/(dashboard)/socias/pessoas/actions'

interface Props {
  tokens: OnboardingToken[]
}

const STATUS_CONFIG = {
  pendente: { label: 'Aguardando', icon: Clock, color: 'text-amber-600 bg-amber-50' },
  completado: { label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  expirado: { label: 'Expirado', icon: AlertCircle, color: 'text-zinc-400 bg-zinc-50' },
}

const ONBOARDING_URL = process.env.NEXT_PUBLIC_ONBOARDING_URL ?? 'https://onboarding.simplizzia.com.br'

export function AbaConvites({ tokens }: Props) {
  const [mostraForm, setMostraForm] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData()
    fd.set('nome', nome)
    fd.set('email', email)
    startTransition(async () => {
      try {
        await actionConvidarParceiro(fd)
        setNome('')
        setEmail('')
        setMostraForm(false)
        setSucesso(true)
        setTimeout(() => setSucesso(false), 4000)
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao enviar convite.')
      }
    })
  }

  function copiarLink(token: string, id: string) {
    navigator.clipboard.writeText(`${ONBOARDING_URL}/parceiro?token=${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header com botão */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {tokens.filter((t) => t.status === 'pendente').length} convite(s) aguardando resposta.
        </p>
        <button
          onClick={() => setMostraForm(!mostraForm)}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Convidar parceiro
        </button>
      </div>

      {/* Sucesso */}
      {sucesso && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          ✅ Convite enviado com sucesso! O parceiro receberá o e-mail em instantes.
        </div>
      )}

      {/* Form de convite */}
      {mostraForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
          <p className="text-sm font-medium text-violet-800">Novo convite de onboarding</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Maria Silva"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="maria@exemplo.com"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {isPending ? 'Enviando...' : 'Enviar convite'}
            </button>
            <button
              type="button"
              onClick={() => setMostraForm(false)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de convites */}
      {tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="mb-3 h-9 w-9 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">Nenhum convite enviado ainda.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {tokens.map((t) => {
            const cfg = STATUS_CONFIG[t.status]
            const Icon = cfg.icon
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{t.parceiro_nome}</p>
                  <p className="text-xs text-zinc-400 truncate">{t.parceiro_email}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Enviado {new Date(t.created_at).toLocaleDateString('pt-BR')} ·
                    Expira {new Date(t.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${cfg.color}`}>
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </span>
                {t.status === 'pendente' && (
                  <button
                    onClick={() => copiarLink(t.token, t.id)}
                    className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition"
                    title="Copiar link de onboarding"
                  >
                    {copiedId === t.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedId === t.id ? 'Copiado!' : 'Link'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
