/**
 * Layout para o fluxo de onboarding de clientes e parceiros.
 * Clean, sem sidebar — público (sem login).
 * Segue o mesmo padrão do (aprovacao)/layout.tsx.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
