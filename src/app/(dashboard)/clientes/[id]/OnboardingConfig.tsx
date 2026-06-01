'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Send, ExternalLink, CheckCircle2, Clock, ChevronDown, ChevronUp, FileText, Hourglass } from 'lucide-react'
import {
  actionSalvarOnboardingConfig,
  actionAdicionarMarca,
  actionEditarMarca,
  actionRemoverMarca,
  actionEnviarLinkOnboarding,
  type OnboardingConfig,
  type OnboardingMarca,
} from './onboarding-actions'

interface Props {
  clienteId: string
  emailCliente?: string
  config?: OnboardingConfig
  appUrl: string
}

// ---------------------------------------------------------------------------
// Formulário de dados do cliente (contexto para a Izzi)
// ---------------------------------------------------------------------------

function DadosClienteForm({
  clienteId,
  config,
}: {
  clienteId: string
  config?: OnboardingConfig
}) {
  const [open, setOpen] = useState(!config?.nome_contato)
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [form, setForm] = useState({
    nome_contato:         config?.nome_contato ?? '',
    cargo_contato:        config?.cargo_contato ?? '',
    setor:                config?.setor ?? '',
    servicos:             (config?.servicos_contratados ?? []).join(', '),
    objetivo_declarado:   config?.objetivo_declarado ?? '',
    dores_identificadas:  config?.dores_identificadas ?? '',
    cenario_atual:        config?.cenario_atual ?? '',
  })

  function handleSave() {
    setSaveError('')
    start(async () => {
      const res = await actionSalvarOnboardingConfig(clienteId, {
        nome_contato:         form.nome_contato || undefined,
        cargo_contato:        form.cargo_contato || undefined,
        setor:                form.setor || undefined,
        servicos_contratados: form.servicos ? form.servicos.split(',').map((s) => s.trim()).filter(Boolean) : [],
        objetivo_declarado:   form.objetivo_declarado || undefined,
        dores_identificadas:  form.dores_identificadas || undefined,
        cenario_atual:        form.cenario_atual || undefined,
      })
      if (res?.error) { setSaveError(res.error); return }
      setSaved(true)
      setOpen(false)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-800">Contexto do cliente</span>
          <span className="text-[11px] text-zinc-400">
            (a Izzi usa esses dados para personalizar a conversa)
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome do contato" value={form.nome_contato} onChange={(v) => setForm((f) => ({ ...f, nome_contato: v }))} placeholder="ex: Ana Souza" />
            <Campo label="Cargo" value={form.cargo_contato} onChange={(v) => setForm((f) => ({ ...f, cargo_contato: v }))} placeholder="ex: Diretora de Marketing" />
          </div>
          <Campo label="Setor / Indústria" value={form.setor} onChange={(v) => setForm((f) => ({ ...f, setor: v }))} placeholder="ex: Laticínios, E-commerce, SaaS..." />
          <Campo label="Serviços contratados" value={form.servicos} onChange={(v) => setForm((f) => ({ ...f, servicos: v }))} placeholder="ex: Social Media, Design de Marca, Tráfego Pago (separados por vírgula)" />
          <CampoTexto label="Objetivo declarado pelo cliente" value={form.objetivo_declarado} onChange={(v) => setForm((f) => ({ ...f, objetivo_declarado: v }))} placeholder="O que o cliente disse que quer alcançar com a Simplizzia..." />
          <CampoTexto label="Dores identificadas" value={form.dores_identificadas} onChange={(v) => setForm((f) => ({ ...f, dores_identificadas: v }))} placeholder="O que o cliente está sentindo dificuldade, o que não funciona hoje..." />
          <CampoTexto label="Cenário atual (o que está mudando)" value={form.cenario_atual} onChange={(v) => setForm((f) => ({ ...f, cenario_atual: v }))} placeholder="Por que o cliente chegou até nós agora? Qual é a situação que gerou essa contratação?" />

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
            >
              {saved ? '✓ Salvo' : pending ? 'Salvando...' : 'Salvar contexto'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Lista de marcas
// ---------------------------------------------------------------------------

function MarcasSection({
  clienteId,
  marcas,
}: {
  clienteId: string
  marcas: OnboardingMarca[]
}) {
  const [adicionando, setAdicionando] = useState(false)
  const [pending, start] = useTransition()
  const [novaForm, setNovaForm] = useState<Partial<OnboardingMarca>>({})
  const [erro, setErro] = useState('')

  function handleAdicionar() {
    if (!novaForm.nome?.trim()) return
    setErro('')
    start(async () => {
      const res = await actionAdicionarMarca(clienteId, {
        nome:                novaForm.nome ?? '',
        publico:             novaForm.publico ?? null,
        site:                novaForm.site ?? null,
        instagram:           novaForm.instagram ?? null,
        linkedin:            novaForm.linkedin ?? null,
        posicionamento_atual: novaForm.posicionamento_atual ?? null,
        concorrentes:        novaForm.concorrentes ?? null,
        contexto_estrategico: novaForm.contexto_estrategico ?? null,
        cenario_atual:       novaForm.cenario_atual ?? null,
      })
      if (res.error) { setErro(res.error); return }
      setNovaForm({})
      setAdicionando(false)
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <span className="text-sm font-semibold text-zinc-800">Marcas a briefar</span>
          <span className="ml-2 text-[11px] text-zinc-400">{marcas.length} marca{marcas.length !== 1 ? 's' : ''}</span>
        </div>
        {!adicionando && (
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand/30 hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar marca
          </button>
        )}
      </div>

      {marcas.length > 0 && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-100">
          {marcas.map((m) => (
            <MarcaRow key={m.id} marca={m} clienteId={clienteId} />
          ))}
        </div>
      )}

      {adicionando && (
        <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-700">Nova marca</p>
          <Campo label="Nome da marca *" value={novaForm.nome ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, nome: v }))} placeholder="ex: Trevo Lácteos" />
          <Campo label="Público-alvo" value={novaForm.publico ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, publico: v }))} placeholder="ex: Supermercados e distribuidoras do Sudeste" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo label="Site" value={novaForm.site ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, site: v }))} placeholder="site.com.br" />
            <Campo label="Instagram" value={novaForm.instagram ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, instagram: v }))} placeholder="@marca" />
            <Campo label="LinkedIn" value={novaForm.linkedin ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, linkedin: v }))} placeholder="linkedin.com/company/..." />
          </div>
          <CampoTexto label="Posicionamento atual" value={novaForm.posicionamento_atual ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, posicionamento_atual: v }))} placeholder="Como a marca se posiciona hoje? O que diz sobre si mesma?" rows={2} />
          <CampoTexto label="Concorrentes" value={novaForm.concorrentes ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, concorrentes: v }))} placeholder="Principais concorrentes diretos e indiretos" rows={2} />
          <CampoTexto label="Contexto estratégico" value={novaForm.contexto_estrategico ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, contexto_estrategico: v }))} placeholder="O que a Simplizzia precisa saber para conduzir o briefing desta marca com inteligência?" rows={3} />
          <CampoTexto label="Cenário atual (o que muda)" value={novaForm.cenario_atual ?? ''} onChange={(v) => setNovaForm((f) => ({ ...f, cenario_atual: v }))} placeholder="O que está acontecendo com esta marca agora que motivou a contratação?" rows={2} />

          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setAdicionando(false); setErro('') }} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50">
              Cancelar
            </button>
            <button
              onClick={handleAdicionar}
              disabled={pending || !novaForm.nome?.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MarcaRow({ marca, clienteId }: { marca: OnboardingMarca; clienteId: string }) {
  const [removePending, startRemove] = useTransition()
  const [editPending, startEdit]     = useTransition()
  const [open, setOpen]     = useState(false)
  const [editando, setEditando] = useState(false)
  const [erro, setErro]     = useState('')
  const [form, setForm]     = useState({
    nome:                marca.nome,
    publico:             marca.publico ?? '',
    site:                marca.site ?? '',
    instagram:           marca.instagram ?? '',
    linkedin:            marca.linkedin ?? '',
    posicionamento_atual: marca.posicionamento_atual ?? '',
    concorrentes:        marca.concorrentes ?? '',
    contexto_estrategico: marca.contexto_estrategico ?? '',
    cenario_atual:       marca.cenario_atual ?? '',
  })

  function handleSalvarEdicao() {
    if (!form.nome.trim()) return
    setErro('')
    startEdit(async () => {
      const res = await actionEditarMarca(clienteId, marca.id, {
        nome:                form.nome,
        publico:             form.publico || null,
        site:                form.site || null,
        instagram:           form.instagram || null,
        linkedin:            form.linkedin || null,
        posicionamento_atual: form.posicionamento_atual || null,
        concorrentes:        form.concorrentes || null,
        contexto_estrategico: form.contexto_estrategico || null,
        cenario_atual:       form.cenario_atual || null,
      })
      if (res.error) { setErro(res.error); return }
      setEditando(false)
    })
  }

  if (editando) {
    return (
      <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-700">Editando: {marca.nome}</p>
        <Campo label="Nome da marca *" value={form.nome} onChange={(v) => setForm(f => ({ ...f, nome: v }))} placeholder="ex: Trevo Lácteos" />
        <Campo label="Público-alvo" value={form.publico} onChange={(v) => setForm(f => ({ ...f, publico: v }))} placeholder="ex: Supermercados do Sudeste" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo label="Site" value={form.site} onChange={(v) => setForm(f => ({ ...f, site: v }))} placeholder="site.com.br" />
          <Campo label="Instagram" value={form.instagram} onChange={(v) => setForm(f => ({ ...f, instagram: v }))} placeholder="@marca" />
          <Campo label="LinkedIn" value={form.linkedin} onChange={(v) => setForm(f => ({ ...f, linkedin: v }))} placeholder="linkedin.com/company/..." />
        </div>
        <CampoTexto label="Posicionamento atual" value={form.posicionamento_atual} onChange={(v) => setForm(f => ({ ...f, posicionamento_atual: v }))} rows={2} />
        <CampoTexto label="Concorrentes" value={form.concorrentes} onChange={(v) => setForm(f => ({ ...f, concorrentes: v }))} rows={2} />
        <CampoTexto label="Contexto estratégico" value={form.contexto_estrategico} onChange={(v) => setForm(f => ({ ...f, contexto_estrategico: v }))} rows={3} />
        <CampoTexto label="Cenário atual" value={form.cenario_atual} onChange={(v) => setForm(f => ({ ...f, cenario_atual: v }))} rows={2} />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditando(false)} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50">Cancelar</button>
          <button onClick={handleSalvarEdicao} disabled={editPending || !form.nome.trim()} className="rounded-xl bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {editPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {marca.status === 'done'
            ? <CheckCircle2 className="h-4 w-4 flex-none text-green-500" />
            : <Clock className="h-4 w-4 flex-none text-zinc-300" />
          }
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800">{marca.nome}</p>
            {marca.publico && <p className="truncate text-xs text-zinc-400">{marca.publico}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen((o) => !o)} className="text-xs text-zinc-400 hover:text-zinc-600">
            {open ? 'Fechar' : 'Ver detalhes'}
          </button>
          <button onClick={() => { setEditando(true); setOpen(false) }} className="text-xs text-zinc-400 hover:text-zinc-600">
            Editar
          </button>
          <button
            onClick={() => startRemove(async () => { await actionRemoverMarca(clienteId, marca.id) })}
            disabled={removePending}
            className="rounded-lg p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
            title="Remover marca"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {marca.briefing_output ? (
            <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {marca.briefing_output}
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-50 p-3 space-y-1.5">
              {[
                ['Público-alvo', marca.publico],
                ['Posicionamento', marca.posicionamento_atual],
                ['Concorrentes', marca.concorrentes],
                ['Contexto estratégico', marca.contexto_estrategico],
                ['Cenário atual', marca.cenario_atual],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
                  <p className="text-xs text-zinc-600">{value}</p>
                </div>
              ))}
              {!marca.publico && !marca.posicionamento_atual && !marca.contexto_estrategico && (
                <p className="text-xs italic text-zinc-400">Nenhum contexto preenchido ainda.</p>
              )}
              <p className="text-[10px] text-zinc-400 pt-1">Briefing pendente — aguardando chat do cliente</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Envio do link
// ---------------------------------------------------------------------------

function EnvioSection({
  clienteId,
  config,
  emailCliente,
  appUrl,
}: {
  clienteId: string
  config: OnboardingConfig
  emailCliente?: string
  appUrl: string
}) {
  const [email, setEmail] = useState(emailCliente ?? '')
  const [pending, start] = useTransition()
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const link = `${appUrl}/onboarding/cliente/${config.token}`
  const foiEnviado = !!config.link_enviado_em

  function handleEnviar() {
    if (!email.trim()) return
    setErro('')
    start(async () => {
      const res = await actionEnviarLinkOnboarding(clienteId, email.trim())
      if (res.error) { setErro(res.error); return }
      setEnviado(true)
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
      <p className="mb-3 text-sm font-semibold text-zinc-800">Enviar link ao cliente</p>

      {foiEnviado && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Link enviado em {new Date(config.link_enviado_em!).toLocaleDateString('pt-BR')}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2">
        <code className="flex-1 truncate text-[11px] text-zinc-500">{link}</code>
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex-none text-zinc-400 hover:text-zinc-600">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@cliente.com.br"
          className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
        />
        <button
          onClick={handleEnviar}
          disabled={pending || !email.trim() || enviado}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {enviado ? 'Enviado!' : pending ? 'Enviando...' : foiEnviado ? 'Reenviar' : 'Enviar'}
        </button>
      </div>
      {erro && <p className="mt-2 text-xs text-red-500">{erro}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status dos documentos gerados (Modo 2 e Modo 3)
// ---------------------------------------------------------------------------

function ModosSection({ modos }: { modos: { modo2: boolean; modo3: boolean } }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
      <p className="mb-3 text-sm font-semibold text-zinc-800">Documentos gerados pela Izzi</p>
      <div className="space-y-2.5">
        <div className="flex items-center gap-3">
          {modos.modo2
            ? <CheckCircle2 className="h-4 w-4 flex-none text-green-500" />
            : <Hourglass className="h-4 w-4 flex-none text-zinc-300" />
          }
          <div>
            <p className={`text-sm font-medium ${modos.modo2 ? 'text-zinc-800' : 'text-zinc-400'}`}>
              Prep de Reunião (Modo 2)
            </p>
            <p className="text-[11px] text-zinc-400">
              {modos.modo2
                ? 'Gerado automaticamente — disponível em Diagnóstico'
                : 'Aguardando conclusão do onboarding…'}
            </p>
          </div>
          {modos.modo2 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
              <FileText className="h-3 w-3" /> Gerado
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {modos.modo3
            ? <CheckCircle2 className="h-4 w-4 flex-none text-green-500" />
            : <Hourglass className="h-4 w-4 flex-none text-zinc-300" />
          }
          <div>
            <p className={`text-sm font-medium ${modos.modo3 ? 'text-zinc-800' : 'text-zinc-400'}`}>
              Briefing Completo (Modo 3)
            </p>
            <p className="text-[11px] text-zinc-400">
              {modos.modo3
                ? 'Gerado automaticamente — disponível em Posicionamento & Marca'
                : 'Aguardando reunião de kickoff (importar notas Gemini do Meet)'}
            </p>
          </div>
          {modos.modo3 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
              <FileText className="h-3 w-3" /> Gerado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers de formulário
// ---------------------------------------------------------------------------

function Campo({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
      />
    </div>
  )
}

function CampoTexto({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-600">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function OnboardingConfig({ clienteId, emailCliente, config, appUrl }: Props) {
  return (
    <div className="space-y-4">
      <DadosClienteForm clienteId={clienteId} config={config} />
      <MarcasSection clienteId={clienteId} marcas={config?.marcas ?? []} />
      {config && (
        <EnvioSection
          clienteId={clienteId}
          config={config}
          emailCliente={emailCliente}
          appUrl={appUrl}
        />
      )}
      {config?.status === 'done' && config.modos && (
        <ModosSection modos={config.modos} />
      )}
    </div>
  )
}
