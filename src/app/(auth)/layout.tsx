// Layout para rotas de autenticação — sem sidebar.
// Cada página controla seu próprio container.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen">{children}</div>
}
