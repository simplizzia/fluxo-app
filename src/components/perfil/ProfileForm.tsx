'use client'

import { useActionState } from 'react'
import {
  actionUpdateProfile,
  actionChangePassword,
  type UpdateProfileState,
  type ChangePasswordState,
} from '@/app/(dashboard)/perfil/actions'
import type { UserProfile } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Formulário de nome
// ---------------------------------------------------------------------------

export function UpdateProfileForm({ profile }: { profile: UserProfile }) {
  const [state, dispatch, isPending] = useActionState<
    UpdateProfileState,
    FormData
  >(actionUpdateProfile, null)

  return (
    <form action={dispatch} className="space-y-4">
      {state?.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">Nome atualizado com sucesso.</p>
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
          defaultValue={profile.nome}
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
        />
        {state?.errors?.nome && (
          <p className="text-xs text-red-600">{state.errors.nome[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? 'Salvando…' : 'Salvar nome'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Formulário de senha
// ---------------------------------------------------------------------------

export function ChangePasswordForm() {
  const [state, dispatch, isPending] = useActionState<
    ChangePasswordState,
    FormData
  >(actionChangePassword, null)

  return (
    <form action={dispatch} className="space-y-4">
      {state?.message && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">Senha atualizada com sucesso.</p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="Mínimo 8 caracteres"
        />
        {state?.errors?.password && (
          <p className="text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="passwordConfirm" className="block text-sm font-medium text-zinc-700">
          Confirmar nova senha
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="Repita a nova senha"
        />
        {state?.errors?.passwordConfirm && (
          <p className="text-xs text-red-600">{state.errors.passwordConfirm[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? 'Salvando…' : 'Alterar senha'}
      </button>
    </form>
  )
}
