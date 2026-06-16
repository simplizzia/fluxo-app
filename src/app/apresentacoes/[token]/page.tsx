import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { ApresentacaoNav, type NavSlide } from './ApresentacaoNav'

/** Rótulo curto para o índice de navegação, a partir do conteúdo do slide. */
function rotuloSlide(tipo: string, conteudo: Record<string, unknown>, n: number): string {
  const titulo = typeof conteudo.titulo === 'string' ? conteudo.titulo.trim() : ''
  if (titulo) return titulo
  const padrao: Record<string, string> = {
    capa: 'Capa',
    titulo_secao: 'Seção',
    texto: 'Texto',
    imagem: 'Imagem',
    texto_imagem: 'Texto e imagem',
    metricas: 'Métricas',
    citacao: 'Citação',
  }
  return padrao[tipo] ?? `Slide ${n}`
}

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const service = createServiceClient()
  const { data } = await service.from('apresentacoes').select('titulo').eq('token', token).maybeSingle() as { data: { titulo: string } | null }
  return { title: data?.titulo ?? 'Apresentação' }
}

export default async function ApresentacaoPublicaPage({ params }: Props) {
  const { token } = await params
  const service = createServiceClient()

  type ApRow = {
    id: string; titulo: string; status: string; tema: Record<string, unknown>
    slides: { id: string; ordem: number; tipo: string; conteudo: Record<string, string | number | boolean | null | undefined | { valor: string; label: string }[]> }[]
  }
  const { data: ap } = await service
    .from('apresentacoes')
    .select(`id, titulo, status, tema, slides:apresentacao_slides(id, ordem, tipo, conteudo)`)
    .eq('token', token)
    .eq('status', 'publicada')
    .maybeSingle() as { data: ApRow | null }

  if (!ap) notFound()

  type SlideRow = { id: string; ordem: number; tipo: string; conteudo: Record<string, string | number | boolean | null | undefined | { valor: string; label: string }[]> }
  const slides = ((ap.slides ?? []) as SlideRow[]).sort((a, b) => a.ordem - b.ordem)
  const tema = (ap.tema ?? {}) as { corPrimaria?: string; corSecundaria?: string; fonteHeadline?: string }

  // Resolve signed URLs para imagens nos slides
  const slidesComUrls = await Promise.all(slides.map(async (s) => {
    const conteudo = { ...s.conteudo }
    for (const campo of ['imagem_url', 'imagem_fundo_url', 'logo_url'] as const) {
      const path = conteudo[campo] as string | undefined
      if (path && !path.startsWith('http')) {
        const { data: signed } = await service.storage
          .from('brand-assets')
          .createSignedUrl(path, 3600)
        if (signed?.signedUrl) conteudo[campo] = signed.signedUrl
      }
    }
    return { ...s, conteudo }
  }))

  const cor = tema.corPrimaria ?? '#7C3AED'

  const navSlides: NavSlide[] = slidesComUrls.map((slide, i) => ({
    n: i + 1,
    label: rotuloSlide(slide.tipo, slide.conteudo, i + 1),
  }))

  return (
    <div className="min-h-screen bg-white font-sans">
      <ApresentacaoNav slides={navSlides} cor={cor} />

      {/* Cada slide é ancorado para navegação por índice */}
      {slidesComUrls.map((slide, i) => (
        <div key={slide.id} id={`slide-${i + 1}`} className="scroll-mt-0">
          <SlidePublico slide={slide} cor={cor} />
        </div>
      ))}

      {/* Rodapé discreto */}
      <footer className="border-t border-zinc-100 py-6 text-center">
        <p className="text-xs text-zinc-400">Apresentação criada com Simplizzia</p>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Renderizador de slide por tipo
// ---------------------------------------------------------------------------

type ConteudoSlide = Record<string, string | number | boolean | null | undefined | { valor: string; label: string }[]>

type SlidePublicoProps = {
  slide: { tipo: string; conteudo: ConteudoSlide }
  cor: string
}

function str(v: unknown): string { return (v as string) ?? '' }

function SlidePublico({ slide, cor }: SlidePublicoProps) {
  const c = slide.conteudo
  const baseClass = 'px-6 py-16 md:px-16 lg:px-32'

  if (slide.tipo === 'capa') {
    return (
      <section
        className="relative flex min-h-[70vh] flex-col items-center justify-center text-center px-6 py-20"
        style={{ background: c.imagem_fundo_url ? undefined : cor }}
      >
        {c.imagem_fundo_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={str(c.imagem_fundo_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}
        <div className="relative z-10">
          {c.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={str(c.logo_url)} alt="Logo" className="mx-auto mb-6 h-16 w-auto object-contain" />
          )}
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            {str(c.titulo)}
          </h1>
          {c.subtitulo && <p className="mt-4 text-lg text-white/80 md:text-xl">{str(c.subtitulo)}</p>}
        </div>
      </section>
    )
  }

  if (slide.tipo === 'titulo_secao') {
    return (
      <section className={`${baseClass} border-t-4 bg-zinc-50`} style={{ borderColor: cor }}>
        {c.numero_secao && (
          <p className="mb-2 text-sm font-bold uppercase tracking-widest" style={{ color: cor }}>
            {String(c.numero_secao).padStart(2, '0')}
          </p>
        )}
        <h2 className="font-display text-3xl font-bold text-zinc-900 md:text-4xl">{str(c.titulo)}</h2>
        {c.descricao && <p className="mt-3 max-w-2xl text-lg text-zinc-500">{str(c.descricao)}</p>}
      </section>
    )
  }

  if (slide.tipo === 'texto') {
    return (
      <section className={`${baseClass} border-b border-zinc-100`}>
        {c.titulo && (
          <h3 className="mb-5 font-display text-2xl font-bold text-zinc-900 md:text-3xl">{str(c.titulo)}</h3>
        )}
        <div className="prose prose-zinc max-w-2xl text-zinc-600">
          <SimpleMarkdown text={str(c.corpo)} />
        </div>
      </section>
    )
  }

  if (slide.tipo === 'imagem') {
    return (
      <section className={`${baseClass} border-b border-zinc-100`}>
        {c.titulo && (
          <h3 className="mb-5 font-display text-2xl font-bold text-zinc-900">{str(c.titulo)}</h3>
        )}
        {c.imagem_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={str(c.imagem_url)} alt={str(c.legenda)} className="max-h-[60vh] w-full rounded-2xl object-contain" />
        )}
        {c.legenda && <p className="mt-3 text-sm text-zinc-400 text-center">{str(c.legenda)}</p>}
      </section>
    )
  }

  if (slide.tipo === 'texto_imagem') {
    const esquerda = c.posicao !== 'direita'
    return (
      <section className={`${baseClass} border-b border-zinc-100`}>
        <div className={`flex flex-col gap-8 md:flex-row md:items-center ${esquerda ? 'md:flex-row-reverse' : ''}`}>
          <div className="flex-1">
            {c.titulo && (
              <h3 className="mb-4 font-display text-2xl font-bold text-zinc-900 md:text-3xl">{str(c.titulo)}</h3>
            )}
            <div className="prose prose-zinc text-zinc-600">
              <SimpleMarkdown text={str(c.corpo)} />
            </div>
          </div>
          {c.imagem_url && (
            <div className="flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={str(c.imagem_url)} alt="" className="w-full rounded-2xl object-cover max-h-80" />
            </div>
          )}
        </div>
      </section>
    )
  }

  if (slide.tipo === 'metricas') {
    const items = (c.items ?? []) as { valor: string; label: string }[]
    return (
      <section className={`${baseClass} border-b border-zinc-100`}>
        {c.titulo && (
          <h3 className="mb-8 font-display text-2xl font-bold text-zinc-900 md:text-3xl text-center">{str(c.titulo)}</h3>
        )}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="text-center">
              <p className="font-display text-4xl font-bold md:text-5xl" style={{ color: cor }}>{item.valor}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (slide.tipo === 'citacao') {
    return (
      <section className={`${baseClass} border-b border-zinc-100 bg-zinc-50`}>
        <blockquote className="max-w-3xl mx-auto text-center">
          <p className="font-display text-2xl font-medium italic text-zinc-700 md:text-3xl">
            &ldquo;{str(c.texto)}&rdquo;
          </p>
          {(c.autor || c.cargo) && (
            <footer className="mt-6">
              {c.autor && <p className="text-sm font-semibold text-zinc-900">{str(c.autor)}</p>}
              {c.cargo && <p className="text-xs text-zinc-500">{str(c.cargo)}</p>}
            </footer>
          )}
        </blockquote>
      </section>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Renderizador mínimo de markdown (negrito, listas)
// ---------------------------------------------------------------------------

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i}>{formatInline(line.slice(2))}</li>
        }
        if (!line.trim()) return <br key={i} />
        return <p key={i}>{formatInline(line)}</p>
      })}
    </>
  )
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}
