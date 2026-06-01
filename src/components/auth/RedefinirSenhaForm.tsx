'use client'

import { useActionState } from 'react'
import { actionRedefinirSenha, type RedefinirState } from '@/app/(auth)/redefinir-senha/actions'

export function RedefinirSenhaForm() {
  const [state, dispatch, isPending] = useActionState<RedefinirState, FormData>(
    actionRedefinirSenha,
    null,
  )

  return (
    <form action={dispatch} className="space-y-5" noValidate>
      {state?.message && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
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
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
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
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="Repita a nova senha"
        />
        {state?.errors?.passwordConfirm && (
          <p className="text-xs text-red-600">{state.errors.passwordConfirm[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Salvando…' : 'Redefinir senha'}
      </button>
    </form>
  )
}
