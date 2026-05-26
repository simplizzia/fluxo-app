import { redirect } from 'next/navigation'

// Rota raiz redireciona para o dashboard.
// A proxy.ts cuida de redirecionar para /login se não autenticado.
export default function RootPage() {
  redirect('/dashboard')
}
