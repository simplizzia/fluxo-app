# Fluxo App

Plataforma operacional da Simplizzia — substitui Notion + Trello + Reportei + WhatsApp.
Domínio: `app.simplizzia.com.br`.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (PostgreSQL + RLS + Realtime) · Claude API · Resend · Vercel.

O guia de desenvolvimento — regras absolutas, padrões, papéis e o que cada um vê —
está em [CLAUDE.md](CLAUDE.md). Leia-o antes de mexer no código.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves (ver CLAUDE.md)
npm run dev                  # http://localhost:3000
```

## Scripts

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm test             # Vitest (lógica pura: transições de status, features, parse do cronograma)

# Gera os tipos do banco (NÃO editar database.generated.ts à mão)
SUPABASE_PROJECT_ID=xxxxx npm run db:types
```

## Estrutura

Visão geral em [CLAUDE.md](CLAUDE.md). Specs de produto em `docs/superpowers/specs/`.
Migrations em `supabase/migrations/` — sempre com `organization_id` e RLS por papel.
