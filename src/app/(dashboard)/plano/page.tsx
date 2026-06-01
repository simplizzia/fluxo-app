import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, BarChart2, ExternalLink, Layers } from 'lucide-react'
import { getCurrentProfile } from '@/lib/dal'
import { buscarUsoMes } from '@/lib/uso'
import { buscarUsoPlanoEquipe, buscarUsoPlanoCliente, buscarConfigUsoOrg } from './actions'
import { UsageBarra } from '@/components/plano/UsageBarra'
import { StatusChip } from '@/components/shared/StatusChip'
import { UsoOrgConfig } from './UsoOrgConfig'
import type { StatusCard } from '@/types/database'

export const metadata: Metadata = {
  title: 'Uso do Plano — Simplizzia',
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function nomeMes(mesRef: string) {
  const [ano, mes] = mesRef.split('-')
  return `${MESES_PT[parseInt(mes, 10) - 1]} ${ano}`
}

// ---------------------------------------------------------------------------
// Uso da organização por tipo (Sprint 5.6 — Controle de Uso Avançado)
// ---------------------------------------------------------------------------

async function ViewUsoOrg({ orgId, isSocia }: { orgId: string; isSocia: boolean }) {
  const [uso, config] = await Promise.all([
    buscarUsoMes(orgId),
    isSocia ? buscarConfigUsoOrg() : Promise.resolve(null),
  ])

  const agora = new Date()
  const mesRef = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  const labelUnidade =
    uso.unidadeControle === 'creditos' ? 'créditos'
    : uso.unidadeControle === 'horas' ? 'horas'
    : 'demandas'

  const labelColCreditos =
    uso.unidadeControle === 'creditos' ? 'Créditos'
    : uso.unidadeControle === 'horas' ? 'Horas'
    : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Layers className="h-4 w-4 text-brand" />
          Uso do Mês por Tipo — {nomeMes(mesRef)}
        </h2>
        {isSocia && config && (
          <UsoOrgConfig
            unidadeControle={config.unidadeControle}
            creditosPorTipo={config.creditosPorTipo}
            tiposDemanda={config.tiposDemanda}
          />
        )}
      </div>

      {/* KPI resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wide mb-1">Total usado</p>
          <p className="text-2xl font-bold text-zinc-900">
            {uso.usado.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{labelUnidade}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wide mb-1">Limite do plano</p>
          <p className="text-2xl font-bold text-zinc-900">
            {uso.limite !== null ? uso.limite.toLocaleString('pt-BR') : '∞'}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{uso.limite !== null ? labelUnidade : 'ilimitado'}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 col-span-2 sm:col-span-1">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wide mb-1">Consumido</p>
          <p className={`text-2xl font-bold ${uso.pct >= 100 ? 'text-red-600' : uso.pct >= 80 ? 'text-orange-500' : 'text-green-600'}`}>
            {uso.pct}%
          </p>
          {uso.limite !== null && (
            <div className="mt-2">
              <UsageBarra usados={uso.usado} limite={uso.limite} porcentagem={uso.pct} />
            </div>
          )}
        </div>
      </div>

      {/* Breakdown por tipo */}
      {uso.detalhePorTipo.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-3 border-b border-zinc-100 bg-zinc-50 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            <span>Tipo de demanda</span>
            <span className="text-center">Qtd. de cards</span>
            {labelColCreditos && <span className="text-right">{labelColCreditos}</span>}
          </div>

          {uso.detalhePorTipo.map((tipo, idx) => {
            const pctLinha = uso.limite
              ? Math.min(100, Math.round((tipo.creditos / uso.limite) * 100))
              : 0

            return (
              <div
                key={tipo.nome}
                className={`grid grid-cols-3 items-center px-5 py-3.5 ${idx < uso.detalhePorTipo.length - 1 ? 'border-b border-zinc-100' : ''}`}
              >
                {/* Nome */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2 w-2 flex-none rounded-full bg-brand/60" />
                  <span className="truncate text-sm font-medium text-zinc-800">{tipo.nome}</span>
                </div>

                {/* Quantidade */}
                <div className="text-center">
                  <span className="text-sm text-zinc-600">{tipo.quantidade}</span>
                </div>

                {/* Créditos/horas — só quando relevante */}
                {labelColCreditos ? (
                  <div className="text-right flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold text-zinc-800">
                      {tipo.creditos.toLocaleString('pt-BR')}
                    </span>
                    {pctLinha > 0 && (
                      <span className="text-[11px] text-zinc-400">({pctLinha}%)</span>
                    )}
                  </div>
                ) : (
                  <div />
                )}
              </div>
            )
          })}
        </div>
      )}

      {uso.detalhePorTipo.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-10 text-center">
          <Layers className="h-7 w-7 text-zinc-300" />
          <p className="text-sm text-zinc-400">Nenhuma demanda criada este mês.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visão da equipe (socia / gestao / atendimento)
// ---------------------------------------------------------------------------

async function ViewEquipe({ orgId, isSocia }: { orgId: string; isSocia: boolean }) {
  const { dados = [], mesRef = '', error } = await buscarUsoPlanoEquipe()

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  const alertas = dados.filter((d) => d.porcentagem >= 80)
  const normais = dados.filter((d) => d.porcentagem < 80)

  return (
    <div className="space-y-8">
      {/* Seção: uso por tipo (Sprint 5.6) */}
      <ViewUsoOrg orgId={orgId} isSocia={isSocia} />

      {/* Seção: uso por cliente */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-zinc-700">Uso por Cliente</h2>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-600">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {alertas.length === 1 ? '1 cliente acima de 80%' : `${alertas.length} clientes acima de 80%`}
            </h3>
            <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white">
              {alertas.map((d, idx) => (
                <ClienteRow
                  key={d.cliente_id}
                  dados={d}
                  isLast={idx === alertas.length - 1}
                  destaque
                />
              ))}
            </div>
          </div>
        )}

        {/* Lista principal */}
        {normais.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-600">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Dentro do plano
            </h3>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {normais.map((d, idx) => (
                <ClienteRow
                  key={d.cliente_id}
                  dados={d}
                  isLast={idx === normais.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {dados.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
            <BarChart2 className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-400">Nenhum cliente ativo com plano configurado.</p>
          </div>
        )}

        <p className="text-xs text-zinc-400">
          Referência: {nomeMes(mesRef)} · Contagem de demandas não canceladas criadas no mês.
        </p>
      </div>
    </div>
  )
}

function ClienteRow({
  dados,
  isLast,
  destaque = false,
}: {
  dados: { cliente_id: string; cliente_nome: string; limite: number; tipo_plano: string; usados: number; porcentagem: number }
  isLast: boolean
  destaque?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 ${!isLast ? 'border-b border-zinc-100' : ''} ${destaque ? 'bg-orange-50/40' : ''}`}
    >
      {/* Nome do cliente */}
      <div className="min-w-0 w-40 flex-none">
        <p className="truncate text-sm font-semibold text-zinc-900">{dados.cliente_nome}</p>
        <p className="text-[11px] text-zinc-400 capitalize">{dados.tipo_plano}</p>
      </div>

      {/* Barra de uso */}
      <div className="flex-1 min-w-0">
        <UsageBarra
          usados={dados.usados}
          limite={dados.limite}
          porcentagem={dados.porcentagem}
        />
      </div>

      {/* Badge de alerta */}
      <div className="flex-none w-28 text-right">
        {dados.porcentagem >= 100 ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            Limite atingido
          </span>
        ) : dados.porcentagem >= 80 ? (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
            {dados.porcentagem}% do plano
          </span>
        ) : null}
      </div>

      {/* Link para o board filtrado */}
      <Link
        href={`/board?cliente=${dados.cliente_id}`}
        className="flex-none text-zinc-400 hover:text-brand transition"
        title="Ver cards deste cliente"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visão do cliente
// ---------------------------------------------------------------------------

async function ViewCliente() {
  const { plano, usados = 0, porcentagem = 0, cards = [], mesRef = '', error } =
    await buscarUsoPlanoCliente()

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  const limite = plano?.limite ?? 10

  return (
    <div className="space-y-6">
      {/* Card de uso */}
      <div
        className={`rounded-2xl border p-6 ${
          porcentagem >= 100
            ? 'border-red-200 bg-red-50'
            : porcentagem >= 80
              ? 'border-orange-200 bg-orange-50'
              : 'border-zinc-200 bg-white'
        }`}
      >
        <p className="mb-4 text-sm font-semibold text-zinc-700">
          Uso do plano em {nomeMes(mesRef)}
        </p>
        <UsageBarra
          usados={usados}
          limite={limite}
          porcentagem={porcentagem}
          height="lg"
        />
        {porcentagem >= 100 && (
          <p className="mt-3 text-sm text-red-700">
            Você atingiu o limite do seu plano este mês. Entre em contato com a Simplizzia para mais informações.
          </p>
        )}
        {porcentagem >= 80 && porcentagem < 100 && (
          <p className="mt-3 text-sm text-orange-700">
            Você utilizou {porcentagem}% do seu plano. Restam {limite - usados} demandas para este mês.
          </p>
        )}
      </div>

      {/* Demandas do mês */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700">
            Demandas em {nomeMes(mesRef)}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className={`flex items-center gap-3 px-5 py-3 ${idx < cards.length - 1 ? 'border-b border-zinc-100' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{card.titulo}</p>
                  <p className="text-[11px] text-zinc-400">
                    {(card.tipo as { nome: string }).nome} ·{' '}
                    {new Date(card.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <StatusChip status={card.status as StatusCard} />
              </div>
            ))}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-12 text-center">
          <BarChart2 className="h-8 w-8 text-zinc-300" />
          <p className="text-sm text-zinc-400">Nenhuma demanda criada este mês.</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default async function PlanoPage() {
  const profile = await getCurrentProfile()
  const isEquipe = ['socia', 'gestao', 'atendimento'].includes(profile.papel)
  const isCliente = profile.papel === 'cliente'
  const isSocia = profile.papel === 'socia'

  if (!isEquipe && !isCliente) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-zinc-900">Uso do Plano</h1>
        <p className="text-sm text-zinc-400">Acesso não disponível para o seu perfil.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Uso do Plano</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {isEquipe
            ? 'Acompanhe o consumo mensal de demandas por tipo e por cliente.'
            : 'Acompanhe o consumo do seu plano este mês.'}
        </p>
      </div>

      {isEquipe ? (
        <ViewEquipe orgId={profile.organization_id} isSocia={isSocia} />
      ) : (
        <ViewCliente />
      )}
    </div>
  )
}
