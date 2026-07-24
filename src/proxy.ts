import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { featureBloqueando } from '@/lib/features'

/**
 * Proxy de autenticação e renovação de sessão.
 * (Next.js 16 renomeou "middleware" para "proxy" — mesma funcionalidade)
 *
 * Responsabilidades:
 * 1. Renovar o access token expirado (via refresh token no cookie)
 * 2. Redirecionar usuários não autenticados para /login
 * 3. Redirecionar usuários autenticados que acessam /login para o dashboard
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANTE: não adicionar lógica entre createServerClient e getUser.
  // Um erro simples pode causar que o usuário fique deslogado randomicamente.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Apresentações HTML estáticas são públicas — sem auth
  if (pathname.endsWith('.html')) {
    return supabaseResponse
  }

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/auth/callback', '/avaliacoes', '/apresentacoes', '/onboarding', '/esqueci-senha', '/redefinir-senha', '/api/onboarding/']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Usuário não autenticado tentando acessar rota protegida
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Usuário autenticado tentando acessar /login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Módulo desligado nesta fase de uso — some do menu e também não abre por URL.
  if (featureBloqueando(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('erro', 'modulo_indisponivel')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica o proxy em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - arquivos com extensão (js, css, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
