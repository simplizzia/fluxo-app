/**
 * Layout para o fluxo de aprovação de conteúdo.
 * Clean, sem sidebar — otimizado para mobile (cliente aprova pelo celular).
 * Auth já garantida pelo proxy.ts (redireciona para /login se não autenticado).
 */
export default function AprovacaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      {children}
    </div>
  )
}
