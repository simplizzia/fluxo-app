'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { actionToggleAcesso } from '../actions'

interface Usuario { id: string; nome: string; papel: string }
interface Cliente { id: string; nome: string }
interface Acesso { profile_id: string; cliente_id: string }

export function AcessosClient({
  usuarios,
  clientes,
  acessos,
}: {
  usuarios: Usuario[]
  clientes: Cliente[]
  acessos: Acesso[]
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [otimista, mudarOtimista] = useOptimistic(
    new Set(acessos.map((a) => `${a.profile_id}:${a.cliente_id}`)),
    (atual, { chave, liberar }: { chave: string; liberar: boolean }) => {
      const next = new Set(atual)
      if (liberar) next.add(chave)
      else next.delete(chave)
      return next
    },
  )

  function toggle(profileId: string, clienteId: string, liberar: boolean) {
    startTransition(async () => {
      mudarOtimista({ chave: `${profileId}:${clienteId}`, liberar })
      const res = await actionToggleAcesso(profileId, clienteId, liberar)
      if (res.error) setErro(res.error)
    })
  }

  if (usuarios.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
        <p className="text-sm text-zinc-400">
          Nenhum usuário de produção (atendimento/executor) cadastrado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60">
              <th className="px-4 py-3 text-xs font-semibold text-zinc-500">Usuário</th>
              {clientes.map((c) => (
                <th key={c.id} className="px-3 py-3 text-center text-xs font-semibold text-zinc-500">
                  {c.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-zinc-800">{u.nome}</p>
                  <p className="text-[10px] text-zinc-400">{u.papel}</p>
                </td>
                {clientes.map((c) => {
                  const chave = `${u.id}:${c.id}`
                  return (
                    <td key={c.id} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={otimista.has(chave)}
                        onChange={(e) => toggle(u.id, c.id, e.target.checked)}
                        className="h-4 w-4 accent-zinc-900"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
