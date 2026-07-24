'use client'

import { useActionState, useState } from 'react'
import {
  actionConvidarUsuario,
  type InviteState,
} from '@/app/(dashboard)/admin/convidar/actions'

const PAPEIS = [
  { value: 'gestao', label: 'Gestão (Diretor de Arte)' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'executor', label: 'Executor (Designer, Editor…)' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'socia', label: 'Sócia' },
] as const

const SUB_PAPEIS = [
  { value: 'responsavel', label: 'Responsável — aprova entregas' },
  { value: 'colaborador', label: 'Colaborador — comenta e acompanha' },
  { value: 'observador', label: 'Observador — só acompanha' },
] as const

export type ClienteOpcao = { id: string; nome: string }

export function InviteForm({ clientes }: { clientes: ClienteOpcao[] }) {
  const [state, dispatch, isPending] = useActionState<InviteState, FormData>(
    actionConvidarUsuario,
    null,
  )
  const [papel, setPapel] = useState('')
  const ehCliente = papel === 'cliente'

  return (
    <form action={dispatch} className="space-y-5" noValidate>
      {state?.message && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      )}

      {state?.success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          Convite enviado com sucesso! O usuário receberá um e-mail com o link de acesso.
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-zinc-700">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="Nome completo"
        />
        {state?.errors?.nome && (
          <p className="text-xs text-red-600">{state.errors.nome[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="email@exemplo.com"
        />
        {state?.errors?.email && (
          <p className="text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="papel" className="block text-sm font-medium text-zinc-700">
          Papel
        </label>
        <select
          id="papel"
          name="papel"
          required
          disabled={isPending}
          defaultValue=""
          onChange={(e) => setPapel(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        >
          <option value="" disabled>
            Selecione o papel…
          </option>
          {PAPEIS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {state?.errors?.papel && (
          <p className="text-xs text-red-600">{state.errors.papel[0]}</p>
        )}
      </div>

      {/* Sem este vínculo o acesso do cliente abre num app vazio: as policies
          filtram pelos clientes a que a pessoa está ligada. */}
      {ehCliente && (
        <div className="space-y-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="space-y-1.5">
            <label htmlFor="cliente_id" className="block text-sm font-medium text-zinc-700">
              Cliente
            </label>
            <select
              id="cliente_id"
              name="cliente_id"
              required
              disabled={isPending}
              defaultValue=""
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
            >
              <option value="" disabled>
                Selecione o cliente…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Define o que esta pessoa enxerga: apenas as demandas, relatórios e a
              marca deste cliente.
            </p>
            {state?.errors?.cliente_id && (
              <p className="text-xs text-red-600">{state.errors.cliente_id[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub_papel" className="block text-sm font-medium text-zinc-700">
              Nível de participação
            </label>
            <select
              id="sub_papel"
              name="sub_papel"
              disabled={isPending}
              defaultValue="responsavel"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
            >
              {SUB_PAPEIS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Enviando convite…' : 'Enviar convite por e-mail'}
      </button>
    </form>
  )
}
