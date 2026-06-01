import type { Metadata } from 'next'
import { Download, Link2, Palette, Type, AlertTriangle } from 'lucide-react'
import { buscarMarcaCliente } from './actions'

export const metadata: Metadata = {
  title: 'Minha Marca — Simplizzia',
}

const CATEGORIA_LABELS: Record<string, string> = {
  brand_system: 'Nossa Estratégia',
  personas: 'Público & Personas',
  diagnostico: 'Diagnóstico',
  parametros: 'Pilares de Conteúdo',
  outros: 'Notas',
}

const ATIVO_LABELS: Record<string, { label: string; emoji: string }> = {
  logo: { label: 'Logo & Marca', emoji: '🎨' },
  paleta: { label: 'Paleta de Cores', emoji: '🎨' },
  tipografia: { label: 'Tipografia', emoji: 'Aa' },
  elemento_grafico: { label: 'Elementos Gráficos', emoji: '✦' },
  mockup: { label: 'Mockups', emoji: '📱' },
  brand_guidelines: { label: 'Brand Guidelines', emoji: '📋' },
}

const SECAO_LABELS: Record<string, string> = {
  fotografia: 'Referências Fotográficas',
  tipografia: 'Tipografia',
  cor: 'Cores',
  textura: 'Texturas',
  referencia_marca: 'Referências de Marca',
  geral: 'Geral',
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url)
}

export default async function MarcaPage() {
  const { data, error } = await buscarMarcaCliente()

  if (error || !data) {
    return <p className="text-sm text-red-600">{error ?? 'Erro ao carregar sua marca.'}</p>
  }

  const { secoes, ativos, moodboard } = data

  // Agrupar ativos por categoria
  const ativosPorCat = new Map<string, typeof ativos>()
  for (const a of ativos) {
    const lista = ativosPorCat.get(a.categoria) ?? []
    lista.push(a)
    ativosPorCat.set(a.categoria, lista)
  }

  // Agrupar moodboard por seção
  const moodPorSecao = new Map<string, typeof moodboard>()
  for (const i of moodboard.filter((i) => !i.antiReferencia)) {
    const lista = moodPorSecao.get(i.secao) ?? []
    lista.push(i)
    moodPorSecao.set(i.secao, lista)
  }

  const temConteudo = secoes.length > 0 || ativos.length > 0 || moodboard.length > 0

  return (
    <div className="space-y-10">
      {/* Cabeçalho */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {data.clienteNome ? `Universo de Marca — ${data.clienteNome}` : 'Minha Marca'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Identidade, estratégia e universo visual da sua marca.
        </p>
      </div>

      {!temConteudo && (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <p className="text-2xl">🎨</p>
          <p className="mt-3 text-sm font-medium text-zinc-700">Em construção</p>
          <p className="mt-1 text-sm text-zinc-400">
            Estamos preparando o Universo da sua Marca. Em breve você verá aqui
            a sua identidade visual, estratégia e referências.
          </p>
        </div>
      )}

      {/* Seções estratégicas */}
      {secoes.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-800">Estratégia & Posicionamento</h2>
          <div className="space-y-4">
            {secoes.map((secao) => {
              const texto = (secao.conteudo?.texto as string) ?? ''
              if (!texto) return null
              return (
                <div key={secao.id} className="rounded-2xl border border-zinc-200 bg-white p-6">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-700">
                    {CATEGORIA_LABELS[secao.categoria] ?? secao.titulo}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{texto}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Identidade Visual */}
      {ativos.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-800">Identidade Visual</h2>
          <div className="space-y-6">
            {Object.entries(ATIVO_LABELS)
              .filter(([cat]) => ativosPorCat.has(cat))
              .map(([cat, info]) => (
                <div key={cat}>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700">
                    <span>{info.emoji}</span>
                    {info.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {(ativosPorCat.get(cat) ?? []).map((ativo) => {
                      const ehImg = isImage(ativo.urlAssinada)
                      return (
                        <div key={ativo.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                          {ehImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ativo.urlAssinada}
                              alt={ativo.nome}
                              className="h-32 w-full bg-zinc-50 object-contain p-3"
                            />
                          ) : (
                            <div className="flex h-20 items-center justify-center bg-zinc-50">
                              <span className="text-2xl">📄</span>
                            </div>
                          )}
                          <div className="p-3">
                            <p className="text-xs font-semibold text-zinc-800">{ativo.nome}</p>
                            {ativo.descricao && (
                              <p className="mt-0.5 text-[11px] text-zinc-400">{ativo.descricao}</p>
                            )}
                            {ativo.notaUso && (
                              <p className="mt-1.5 text-[11px] italic text-zinc-500 border-t border-zinc-100 pt-1.5">
                                {ativo.notaUso}
                              </p>
                            )}
                            {ativo.urlAssinada && (
                              <a
                                href={ativo.urlAssinada}
                                download={ativo.nome}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-zinc-200 py-1.5 text-[11px] text-zinc-500 transition hover:border-brand/30 hover:bg-brand-light hover:text-brand"
                              >
                                <Download className="h-3 w-3" />
                                Baixar
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Moodboard */}
      {moodboard.filter((i) => !i.antiReferencia).length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-800">Universo Visual</h2>
          <p className="text-sm text-zinc-500">
            O painel de referências que define a atmosfera e a personalidade da sua marca.
          </p>
          <div className="space-y-6">
            {Array.from(moodPorSecao.entries()).map(([secao, items]) => (
              <div key={secao}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {SECAO_LABELS[secao] ?? secao}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                    >
                      {item.tipo === 'link_externo' && (
                        <div className="flex min-h-[80px] flex-col items-center justify-center gap-2 p-4">
                          <Link2 className="h-5 w-5 text-zinc-300" />
                          <a
                            href={item.url ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-center text-xs text-brand hover:underline"
                          >
                            {item.url?.replace(/^https?:\/\//, '').split('/')[0]}
                          </a>
                        </div>
                      )}
                      {item.tipo === 'cor' && item.corHex && (
                        <div>
                          <div className="h-20 w-full" style={{ backgroundColor: item.corHex }} />
                          <div className="p-2 text-center font-mono text-xs font-semibold text-zinc-700">
                            {item.corHex}
                          </div>
                        </div>
                      )}
                      {item.tipo === 'texto' && (
                        <div className="flex min-h-[80px] items-center justify-center p-4">
                          <p className="text-center text-sm font-medium italic text-zinc-700">"{item.texto}"</p>
                        </div>
                      )}
                      {item.nota && (
                        <div className="border-t border-zinc-100 px-3 pb-3 pt-2">
                          <p className="text-[11px] italic text-zinc-500">{item.nota}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
