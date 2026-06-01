'use client'

import { useActionState } from 'react'
import { actionLogin, type LoginState } from '@/app/(auth)/login/actions'

export function LoginForm() {
  const [state, dispatch, isPending] = useActionState<LoginState, FormData>(
    actionLogin,
    null,
  )

  return (
    <form action={dispatch} className="space-y-5" noValidate>
      {/* Erro global */}
      {state?.message && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      )}

      {/* E-mail */}
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

      {/* Senha */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
          placeholder="••••••••"
        />
        {state?.errors?.password && (
          <p className="text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      {/* Esqueci a senha */}
      <div className="flex justify-end">
        <a
          href="/esqueci-senha"
          className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
        >
          Esqueci a senha
        </a>
      </div>

      {/* Botão */}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Entrando…
          </>
        ) : (
          'Entrar'
        )}
      </button>
    </form>
  )
}
