export default function ObrigadoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F4F4] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header com gradiente */}
        <div
          className="mb-1 rounded-2xl px-6 py-4"
          style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-white">Simplizzia</span>
            <span className="text-xs text-white/70">por Izzi</span>
          </div>
        </div>

        {/* Card de agradecimento */}
        <div className="rounded-2xl bg-white px-8 py-10 text-center">
          <p className="mb-4 text-5xl">💜</p>
          <h1 className="mb-2 font-display text-2xl font-bold text-zinc-900">Obrigada!</h1>
          <p className="mb-1 text-sm leading-relaxed text-zinc-600">
            Sua avaliação foi enviada com sucesso.
          </p>
          <p className="text-sm leading-relaxed text-zinc-500">
            Seu feedback é muito importante para continuarmos crescendo e entregando o melhor
            para você.
          </p>
          <p className="mt-5 font-display text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#A046C6 0%,#F9267C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            — Izzi &amp; equipe Simplizzia 💜
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Izzi · Assistente da Simplizzia
        </p>
      </div>
    </div>
  )
}
