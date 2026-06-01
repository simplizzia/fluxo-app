'use client'

import { useActionState } from 'react'
import { actionEsqueciSenha, type EsqueciState } from '@/app/(auth)/esqueci-senha/actions'

export function EsqueciSenhaForm() {
  const [state, dispatch, isPending] = useActionState<EsqueciState, FormData>(
    actionEsqueciSenha,
    null,
  )

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-800">E-mail enviado!</p>
        <p className="text-sm text-zinc-500">
          Se esse e-mail estiver cadastrado, você receberá o link para redefinir a senha em alguns instantes.
          Verifique também a caixa de spam.
        </p>
      </div>
    )
  }

  return (
    <form action={dispatch} className="space-y-5" noValidate>
      {state?.message && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="voce@simplizzia.com.br"
        />
        {state?.errors?.email && (
          <p className="text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Enviando…' : 'Enviar link de recuperação'}
      </button>
    </form>
  )
}
