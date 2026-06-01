import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface BuscaResultado {
  tipo: 'card' | 'cliente' | 'reuniao' | 'marca'
  id: string
  titulo: string
  subtitulo?: string
  href: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, papel, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 401 })

  const resultados: BuscaResultado[] = []

  // ── Cards ──────────────────────────────────────────────────────────────────
  const cardsQuery = supabase
    .from('cards')
    .select('id, titulo, status, clientes(nome)')
    .ilike('titulo', `%${q}%`)
    .limit(5)

  // Cliente vê apenas seus próprios cards (RLS já filtra, mas por segurança)
  const { data: cards } = await cardsQuery

  for (const c of cards ?? []) {
    resultados.push({
      tipo: 'card',
      id: c.id,
      titulo: c.titulo,
      subtitulo: (c.clientes as unknown as { nome: string } | null)?.nome ?? undefined,
      href: `/board?card=${c.id}`,
    })
  }

  // ── Clientes (não-cliente) ─────────────────────────────────────────────────
  if (profile.papel !== 'cliente') {
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nome, status')
      .ilike('nome', `%${q}%`)
      .limit(5)

    for (const c of clientes ?? []) {
      resultados.push({
        tipo: 'cliente',
        id: c.id,
        titulo: c.nome,
        subtitulo: c.status === 'ativo' ? 'Ativo' : 'Inativo',
        href: `/clientes/${c.id}`,
      })
    }
  }

  // ── Reuniões (equipe) ──────────────────────────────────────────────────────
  if (['socia', 'gestao', 'atendimento'].includes(profile.papel)) {
    const { data: reunioes } = await supabase
      .from('reunioes')
      .select('id, tipo, data_reuniao, clientes(nome), prospects(nome)')
      .or(`notas_brutas.ilike.%${q}%, resumo_gerado.ilike.%${q}%`)
      .limit(3)

    for (const r of reunioes ?? []) {
      const contextNome =
        (r.clientes as unknown as { nome: string } | null)?.nome ??
        (r.prospects as unknown as { nome: string } | null)?.nome ??
        'Reunião interna'
      resultados.push({
        tipo: 'reuniao',
        id: r.id,
        titulo: contextNome,
        subtitulo: new Date(r.data_reuniao).toLocaleDateString('pt-BR'),
        href: `/reunioes/${r.id}`,
      })
    }
  }

  // ── Universo da marca ──────────────────────────────────────────────────────
  if (profile.papel !== 'executor') {
    const { data: marca } = await supabase
      .from('universo_marca')
      .select('id, titulo, categoria, cliente_id, clientes(nome)')
      .ilike('titulo', `%${q}%`)
      .limit(3)

    for (const m of marca ?? []) {
      resultados.push({
        tipo: 'marca',
        id: m.id,
        titulo: m.titulo,
        subtitulo: (m.clientes as unknown as { nome: string } | null)?.nome ?? undefined,
        href: `/marca?cliente=${m.cliente_id}`,
      })
    }
  }

  return NextResponse.json({ resultados })
}
