@AGENTS.md

# Fluxo App — Guia de Desenvolvimento

Plataforma operacional da Simplizzia. Substitui Notion + Trello + Reportei + WhatsApp.
Domínio: `app.simplizzia.com.br` | Repositório: `fluxo-app`

Specs em `docs/superpowers/specs/`. O fluxo de cronograma está em
`docs/superpowers/specs/2026-07-24-fluxo-cronograma-design.md`.

---

## Stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS v4**
- **Supabase** — PostgreSQL + RLS + Realtime + Edge Functions + Storage + pg_cron
- **shadcn/ui** + **Lucide React** (ícones)
- **Resend** (email) · **Claude API** (Izzi, agentes, relatórios)
- **Vercel** (deploy)

---

## Regras absolutas

### 1. organization_id em tudo
Toda tabela nova **obrigatoriamente** inclui:
```sql
organization_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE
```
Toda RLS policy **obrigatoriamente** inclui a condição:
```sql
organization_id = auth_organization_id()
```
Sem exceção. Sem atalho. É o que garante isolamento entre tenants.

### 2. RLS no banco, não no frontend
Permissões são implementadas como PostgreSQL policies. O frontend **nunca** decide o que mostrar baseado em papel — o banco retorna apenas o que o usuário tem direito de ver. Se um `executor` tentar buscar um card de outro executor via API direta, o banco retorna vazio.

### 3. Campos internos nunca vazam para o cliente
`campos_internos` dos cards (custo, horas, notas, outputs IA) têm RLS separado. Só `socia`, `gestao` e `atendimento` leem essa coluna. Cliente e executor não veem.

### 4. Área das Sócias: papel socia exclusivamente
Todas as tabelas prefixadas com `socias_` têm policy `AND is_socia()`. Qualquer acesso de outro papel é negado no banco.

### 5. Service role key: nunca no frontend
`SUPABASE_SERVICE_ROLE_KEY` só aparece em `src/lib/supabase/server.ts` via `createServiceClient()`. Jamais em Client Components ou variáveis `NEXT_PUBLIC_*`.

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/           # Login, callback, sem sidebar
│   ├── (dashboard)/      # App principal, com layout + sidebar
│   │   ├── board/        # Kanban (+ actions.ts com as regras de card)
│   │   ├── cronogramas/  # Fluxo de cronograma → conteúdo
│   │   ├── calendario/
│   │   ├── clientes/     # inclui marcas/[marcaId] (universo + produtos)
│   │   ├── pipeline/     # CRM (só sócias)
│   │   ├── reunioes/
│   │   └── socias/       # Área das sócias (só sócias)
│   ├── (aprovacao)/      # Aprovação de card (deep-link de e-mail/WhatsApp)
│   └── avaliacoes/       # NPS público (sem login, token único)
├── components/
│   ├── board/            # Componentes do Kanban
│   └── shared/           # StatusChip, Toast, Skeleton, InlineError, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # Browser client (Client Components)
│   │   └── server.ts     # Server client + service client
│   ├── cards/status.ts   # fonte única: config + regras de transição de status
│   ├── features.ts       # feature flags (o que está ligado nesta fase de uso)
│   ├── dal.ts            # verifySession, getCurrentProfile, requirePapel/Feature
│   ├── agents/           # executor + catalog (65+ agentes de IA)
│   └── utils.ts          # cn(), formatDate(), etc.
├── proxy.ts              # Auth guard global + gate de feature (ex-"middleware")
└── types/
    ├── database.ts           # barril escrito à mão: reexporta o gerado + apelidos
    └── database.generated.ts # gerado por: npm run db:types (NÃO editar)
```

Componentes de UI hoje são feitos à mão (`components/ui/` não existe). Há um
design system mínimo por consolidar — ver Fase 5 do plano v2.

---

## Padrões de código

### Supabase queries
```typescript
// Server Component — sempre usar createClient() de server.ts
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase
  .from('cards')
  .select('id, titulo, status, prioridade')
  .eq('cliente_id', clienteId)
  .order('prioridade', { ascending: false })
```

### Client Component com realtime
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
// Usar useEffect para subscrever ao canal Realtime
```

### Server Actions (mutações)
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
// Validar input com zod antes de qualquer query
// Nunca confiar em dados vindos do cliente
```

---

## Nomenclatura

| Contexto | Convenção | Exemplo |
|---|---|---|
| Tabelas SQL | snake_case | `tipos_demanda` |
| Colunas SQL | snake_case | `organization_id` |
| Componentes React | PascalCase | `CardKanban.tsx` |
| Funções/variáveis TS | camelCase | `formatDate()` |
| Rotas Next.js | kebab-case | `para-aprovacao/` |
| Server Actions | `action` prefix | `actionCreateCard.ts` |

---

## Papéis e o que cada um vê

| Papel | Board | Clientes | Pipeline CRM | Área Sócias |
|---|---|---|---|---|
| `socia` | Tudo (incl. confidenciais) | Todos | Sim | Sim |
| `gestao` | Só cards de design | Todos (read) | Não | Não |
| `atendimento` | Tudo exceto confidenciais | Todos | Notas/reuniões | Não |
| `executor` | Só cards atribuídos a ele | — | Não | Não |
| `cliente` | Só os próprios cards | — | Não | Não |

---

## Fluxo de status dos cards

```
aguardando_info → a_fazer → em_andamento → para_aprovacao → necessita_ajustes → concluido
                                                                                 cancelado
```

**Regra crítica:** `para_aprovacao` só é atingido via ação explícita da equipe. O sistema nunca avança automaticamente para esse status.

**Embalagens** têm `fluxo_aprovacao_duplo = true`: aprovação técnica interna (especialista + gestao) é necessária antes de `para_aprovacao`.

---

## Comandos úteis

```bash
# Desenvolvimento
npm run dev

# Verificar tipos
npm run type-check

# Lint
npm run lint

# Gerar tipos do Supabase (após conectar o projeto)
SUPABASE_PROJECT_ID=xxxxx npm run db:types

# Rodar migrations localmente (requer Supabase CLI)
npx supabase db push
```

---

## Variáveis de ambiente necessárias

Ver `.env.example` para a lista completa. Mínimo para rodar localmente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`

---

## Estado (v2, 2026-07)

Consolidação para uso com equipe e clientes. Plano em
`~/.claude/plans/podemos-come-ar-uma-nova-shimmying-sloth.md`.

| Fase | Estado | O que entrega |
|---|---|---|
| 0 — Destravar o repo | ✅ | migrations reconciliadas, EOL, código morto removido |
| 1 — Acesso | ✅ | vazamentos de RLS fechados, papel `cliente` utilizável |
| 2 — Kanban | ✅ | regra de transição no servidor, fonte única de status, marca no card |
| 3 — Produtos e marca | ✅ | tabela `produtos`, escopo por marca nos agentes |
| 4 — Cronograma | ✅ | 6 agentes, tela de revisão com chat, desmembramento, aprendizados |
| 5 — Fundação | 🚧 | testes, SDKs preguiçosos, docs; design system por consolidar |

**Lançamento:** só o núcleo + Calendário + Cronograma visíveis. Os demais
módulos ficam ocultos via `src/lib/features.ts` (trocar `false`→`true` religa).

**Exceção à Regra #1:** `agent_catalog` é um catálogo global de agentes e não
tem `organization_id` — é o único caso legítimo. Todo o resto segue a regra.
