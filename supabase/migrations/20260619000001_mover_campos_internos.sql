-- ===========================================================================
-- Move campos_internos (custo, horas, notas, outputs IA) de `cards` para uma
-- tabela própria `cards_internos`, isolada por RLS.
--
-- Motivo (segurança): RLS no PostgreSQL é row-level e NÃO mascara colunas.
-- Enquanto campos_internos vivia em `cards`, qualquer usuário autenticado
-- (inclusive cliente e executor) podia lê-la via PostgREST direto com o próprio
-- JWT, pois a visibilidade da LINHA já era concedida pela RLS de cards.
-- A view cards_safe (mecanismo previsto) nunca foi usada pelo app.
--
-- Solução: tabela com RLS habilitada e SEM policy para `authenticated`
-- (negação por padrão). A equipe lê/escreve server-side via service role,
-- que ignora RLS. Como a coluna some de `cards`, qualquer `select *` em cards
-- passa a ser seguro automaticamente.
-- ===========================================================================

-- 1. View antiga referencia a coluna e impediria o DROP — e seria substituída
--    por esta tabela de qualquer forma.
DROP VIEW IF EXISTS public.cards_safe;

-- 2. Tabela de campos internos (1:1 com cards)
CREATE TABLE IF NOT EXISTS public.cards_internos (
  card_id         uuid PRIMARY KEY REFERENCES public.cards(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  dados           jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_internos_org ON public.cards_internos(organization_id);

-- 3. Backfill dos dados existentes
INSERT INTO public.cards_internos (card_id, organization_id, dados)
SELECT id, organization_id, campos_internos
FROM public.cards
WHERE campos_internos IS NOT NULL AND campos_internos <> '{}'::jsonb
ON CONFLICT (card_id) DO NOTHING;

-- 4. RLS habilitada SEM policy para anon/authenticated => negação por padrão
--    para todo acesso via API REST. service_role (server-only) ignora RLS.
--    A visibilidade por papel é garantida na aplicação: o card é carregado
--    antes via RLS de `cards`; só então a equipe lê cards_internos via service.
ALTER TABLE public.cards_internos ENABLE ROW LEVEL SECURITY;

-- Defesa em profundidade: remove grants padrão do Supabase nesta tabela.
REVOKE ALL ON public.cards_internos FROM anon, authenticated;

-- 5. Remove a coluna antiga de cards (agora `select *` em cards é seguro)
ALTER TABLE public.cards DROP COLUMN IF EXISTS campos_internos;
