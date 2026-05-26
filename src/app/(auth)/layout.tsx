// Layout para rotas de autenticação (/login, /definir-senha)
// Sem sidebar, centralizando o conteúdo vertical e horizontalmente.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
