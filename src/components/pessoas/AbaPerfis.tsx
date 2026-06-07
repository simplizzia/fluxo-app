'use client'

import { useState } from 'react'
import { UserCircle2, MapPin, Calendar, ChevronDown, ChevronUp, FileText, X } from 'lucide-react'
import type { ParceiroPerfilResumo } from '@/app/(dashboard)/socias/pessoas/actions'

interface Props {
  perfis: ParceiroPerfilResumo[]
}

export function AbaPerfis({ perfis }: Props) {
  const [perfilAberto, setPerfilAberto] = useState<ParceiroPerfilResumo | null>(null)

  if (!perfis.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserCircle2 className="mb-3 h-10 w-10 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-500">Nenhum perfil de parceiro ainda.</p>
        <p className="mt-1 text-xs text-zinc-400">
          Os perfis aparecem aqui após o parceiro concluir o onboarding com a Izzi.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {perfis.map((p) => (
          <PerfilCard key={p.id} perfil={p} onAbrir={() => setPerfilAberto(p)} />
        ))}
      </div>

      {/* Modal de perfil completo */}
      {perfilAberto && (
        <PerfilModal perfil={perfilAberto} onFechar={() => setPerfilAberto(null)} />
      )}
    </>
  )
}

function PerfilCard({ perfil: p, onAbrir }: { perfil: ParceiroPerfilResumo; onAbrir: () => void }) {
  const iniciais = p.nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const hobbies = (p.dados_pessoais as { hobbies?: string[] })?.hobbies ?? []
  const musicas = (p.dados_pessoais as { musicas?: string[] })?.musicas ?? []

  return (
    <button
      onClick={onAbrir}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm text-left hover:border-violet-300 hover:shadow-md transition group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-bold text-white">
          {iniciais}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 truncate">{p.nome}</p>
          <p className="text-xs text-zinc-400 truncate">{p.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 mb-3">
        {p.cidade && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />{p.cidade}
          </span>
        )}
        {p.nascimento && (
          <span className="flex items-center gap-0.5">
            <Calendar className="h-3 w-3" />
            {new Date(p.nascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

      {(hobbies.length > 0 || musicas.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {[...hobbies.slice(0, 2), ...musicas.slice(0, 1)].map((tag, i) => (
            <span key={i} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] text-violet-600">
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-zinc-400 group-hover:text-violet-500 transition flex items-center gap-0.5">
        Ver perfil completo <ChevronDown className="h-3 w-3" />
      </p>
    </button>
  )
}

function PerfilModal({ perfil: p, onFechar }: { perfil: ParceiroPerfilResumo; onFechar: () => void }) {
  const [mostraMarkdown, setMostraMarkdown] = useState(false)
  const pes = p.dados_pessoais as Record<string, unknown>
  const prof = p.dados_profissionais as Record<string, unknown>
  const datas = p.datas_importantes as Record<string, unknown>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-bold text-white">
              {p.nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-zinc-900">{p.nome}</p>
              <p className="text-xs text-zinc-400">{p.email}</p>
            </div>
          </div>
          <button onClick={onFechar} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dados básicos */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Dados básicos</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {p.cidade && <InfoItem label="Cidade" value={p.cidade} />}
              {p.whatsapp && <InfoItem label="WhatsApp" value={p.whatsapp} />}
              {p.nascimento && <InfoItem label="Nascimento" value={new Date(p.nascimento).toLocaleDateString('pt-BR')} />}
              {(pes.estado_civil as string) && <InfoItem label="Estado civil" value={pes.estado_civil as string} />}
            </div>
          </section>

          {/* Dados pessoais */}
          {Object.keys(pes).length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Vida pessoal</h3>
              <div className="grid gap-2">
                {(pes.filhos as number | undefined) != null && (
                  <InfoItem label="Filhos" value={String(pes.filhos)} />
                )}
                {Array.isArray(pes.pets) && pes.pets.length > 0 && (
                  <InfoItem label="Pets" value={(pes.pets as string[]).join(', ')} />
                )}
                {Array.isArray(pes.hobbies) && pes.hobbies.length > 0 && (
                  <InfoItem label="Hobbies" value={(pes.hobbies as string[]).join(', ')} />
                )}
                {Array.isArray(pes.musicas) && pes.musicas.length > 0 && (
                  <InfoItem label="Músicas favoritas" value={(pes.musicas as string[]).join(', ')} />
                )}
                {Array.isArray(pes.series) && pes.series.length > 0 && (
                  <InfoItem label="Séries" value={(pes.series as string[]).join(', ')} />
                )}
                {(pes.comida as string) && (
                  <InfoItem label="Comida favorita" value={pes.comida as string} />
                )}
                {Array.isArray(pes.esportes) && pes.esportes.length > 0 && (
                  <InfoItem label="Esportes" value={(pes.esportes as string[]).join(', ')} />
                )}
                {(pes.signo as string) && (
                  <InfoItem label="Signo" value={pes.signo as string} />
                )}
              </div>
            </section>
          )}

          {/* Dados profissionais */}
          {Object.keys(prof).length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Perfil profissional</h3>
              <div className="grid gap-2">
                {Array.isArray(prof.ferramentas) && prof.ferramentas.length > 0 && (
                  <InfoItem label="Ferramentas" value={(prof.ferramentas as string[]).join(', ')} />
                )}
                {(prof.feedback as string) && (
                  <InfoItem label="Prefere feedback" value={prof.feedback as string} />
                )}
                {(prof.horario_reunioes as string) && (
                  <InfoItem label="Melhor horário para reuniões" value={prof.horario_reunioes as string} />
                )}
                {(prof.comunicacao as string) && (
                  <InfoItem label="Comunicação preferida" value={prof.comunicacao as string} />
                )}
                {Array.isArray(prof.areas_interesse) && prof.areas_interesse.length > 0 && (
                  <InfoItem label="Áreas de interesse" value={(prof.areas_interesse as string[]).join(', ')} />
                )}
              </div>
            </section>
          )}

          {/* Datas importantes */}
          {Object.keys(datas).length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Datas importantes</h3>
              <div className="grid gap-2">
                {(datas.aniversario as string) && (
                  <InfoItem label="Aniversário" value={new Date(datas.aniversario as string).toLocaleDateString('pt-BR')} />
                )}
                {Array.isArray(datas.outros) && datas.outros.map((d, i) => (
                  <InfoItem key={i} label="Data especial" value={d as string} />
                ))}
              </div>
            </section>
          )}

          {/* Perfil completo (markdown) */}
          {p.perfil_markdown && (
            <section>
              <button
                onClick={() => setMostraMarkdown(!mostraMarkdown)}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                <FileText className="h-3.5 w-3.5" />
                {mostraMarkdown ? 'Ocultar' : 'Ver'} perfil completo gerado pela Izzi
                {mostraMarkdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {mostraMarkdown && (
                <pre className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 whitespace-pre-wrap">
                  {p.perfil_markdown}
                </pre>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="font-medium text-zinc-500">{label}:</span>{' '}
      <span className="text-zinc-800">{value}</span>
    </div>
  )
}
