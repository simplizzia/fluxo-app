'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import {
  actionAtualizarPapel,
  actionAtualizarAtivo,
  actionReenviarAcesso,
} from '@/app/(dashboard)/admin/usuarios/actions'
import { InviteForm } from '@/components/admin/InviteForm'
import type { Database } from '@/types/database'

type PapelUsuario = Database['public']['Enums']['papel_usuario']

export type UsuarioRow = {
  profileId: string
  userId: string
  nome: string
  email: string
  papel: PapelUsuario
  ativo: boolean
  createdAt: string
}

const PAPEIS: { value: PapelUsuario; label: string }[] = [
  { value: 'socia',       label: 'Sócia'       },
  { value: 'gestao',      label: 'Gestão'       },
  { value: 'atendimento', label: 'Atendimento'  },
  { value: 'executor',    label: 'Executor'     },
  { value: 'cliente',     label: 'Cliente'      },
]

const PAPEL_CORES: Record<PapelUsuario, string> = {
  socia:       'bg-purple-100 text-purple-700',
  gestao:      'bg-blue-100 text-blue-700',
  atendimento: 'bg-emerald-100 text-emerald-700',
  executor:    'bg-orange-100 text-orange-700',
  cliente:     'bg-zinc-100 text-zinc-600',
}

function PapelSelect({ profileId, papelInicial }: { profileId: string; papelInicial: PapelUsuario }) {
  const [papel, setPapel] = useState(papelInicial)
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={papel}
      disabled={isPending}
      onChange={(e) => {
        const novo = e.target.value as PapelUsuario
        setPapel(novo)
        startTransition(async () => {
          await actionAtualizarPapel(profileId, novo)
        })
      }}
      className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 outline-none cursor-pointer transition disabled:opacity-60 ${PAPEL_CORES[papel]}`}
    >
      {PAPEIS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  )
}

function AcoesUsuario({ usuario }: { usuario: UsuarioRow }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function flash(texto: string) {
    setMsg(texto)
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      {msg && <span className="text-green-600 font-medium">{msg}</span>}
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await actionAtualizarAtivo(usuario.profileId, !usuario.ativo)
            if (res?.success) flash(usuario.ativo ? 'Desativado' : 'Ativado')
          })
        }
        className="text-zinc-400 hover:text-zinc-800 transition disabled:opacity-40"
      >
        {usuario.ativo ? 'Desativar' : 'Ativar'}
      </button>
      <span className="text-zinc-200 select-none">|</span>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await actionReenviarAcesso(usuario.email, usuario.nome, usuario.papel)
            if (res?.success) flash('Acesso enviado!')
            else flash('Erro ao enviar')
          })
        }
        className="text-zinc-400 hover:text-zinc-800 transition disabled:opacity-40"
      >
        Reenviar acesso
      </button>
    </div>
  )
}

export function UsuariosTabela({ usuarios }: { usuarios: UsuarioRow[] }) {
  const [showConvite, setShowConvite] = useState(false)

  const ativos   = usuarios.filter((u) => u.ativo)
  const inativos = usuarios.filter((u) => !u.ativo)
  const ordenados = [...ativos, ...inativos]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
          {inativos.length > 0 && ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setShowConvite(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition"
        >
          <UserPlus className="h-4 w-4" />
          Convidar novo
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Papel</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ordenados.map((u) => (
              <tr key={u.profileId} className={u.ativo ? '' : 'opacity-50 bg-zinc-50/50'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{u.nome}</p>
                  <p className="text-xs text-zinc-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <PapelSelect profileId={u.profileId} papelInicial={u.papel} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.ativo ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <AcoesUsuario usuario={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ordenados.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-400">Nenhum usuário cadastrado.</p>
        )}
      </div>

      {/* Modal de convite */}
      {showConvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConvite(false) }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Convidar usuário</h2>
              <button
                onClick={() => setShowConvite(false)}
                className="text-zinc-400 hover:text-zinc-600 transition text-xl leading-none"
              >
                ×
              </button>
            </div>
            <InviteForm />
          </div>
        </div>
      )}
    </div>
  )
}
