-- ===========================================================================
-- Reconcilia 20260619000001_mover_campos_internos.sql
-- 2026-07-24
--
-- A migration de 19/06 consta como aplicada em supabase_migrations.schema_migrations,
-- mas nenhum dos seus efeitos existe neste banco. Verificado em 2026-07-24:
--
--   cards.campos_internos  -> ainda existe (deveria ter sido removida)
--   cards_internos         -> nao existe   (deveria ter sido criada)
--   cards_safe             -> ainda existe (deveria ter sido removida)
--
-- Comparando as 79 tabelas que as migrations criam com as 78 presentes no
-- banco, esta e a UNICA divergencia — nenhuma outra migration falhou em
-- silencio. A causa provavel e um `migration repair --status applied` avulso.
--
-- Duas consequencias, ambas em producao:
--
--  1. Seguranca. RLS no PostgreSQL e row-level e NAO mascara colunas. Com
--     campos_internos vivendo em `cards`, qualquer usuario autenticado cuja
--     policy conceda a LINHA — inclusive `cliente` e `executor` — le custo,
--     horas, notas e outputs de IA via PostgREST com o proprio JWT. E a Regra
--     #3 do CLAUDE.md, hoje nao cumprida.
--
--  2. Funcional. board/actions.ts le e escreve `cards_internos`, que nao
--     existe; essa parte do board falha em producao.
--
-- Reaplica o conteudo de 20260619000001 como migration nova, em vez de
-- reverter e re-executar aquela, para manter o historico append-only. Todo
-- passo e idempotente, entao rodar de novo e inofensivo.
--
-- Risco de dado: nenhum. `cards` tem 0 linhas neste banco (verificado em
-- 2026-07-24), logo o backfill e vazio e o DROP COLUMN nao descarta nada.
-- ===========================================================================

-- 1. A view referencia a coluna e impediria o DROP; e substituida pela tabela.
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

-- 3. Backfill (no-op enquanto cards estiver vazia; mantido para reprodutibilidade
--    em qualquer ambiente que ainda tenha a coluna preenchida)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'campos_internos'
  ) THEN
    INSERT INTO public.cards_internos (card_id, organization_id, dados)
    SELECT id, organization_id, campos_internos
    FROM public.cards
    WHERE campos_internos IS NOT NULL AND campos_internos <> '{}'::jsonb
    ON CONFLICT (card_id) DO NOTHING;
  END IF;
END $$;

-- 4. RLS habilitada SEM policy para anon/authenticated => negacao por padrao.
--    service_role tem BYPASSRLS e continua lendo/escrevendo server-side.
ALTER TABLE public.cards_internos ENABLE ROW LEVEL SECURITY;

-- Defesa em profundidade: remove os grants padrao do Supabase nesta tabela.
REVOKE ALL ON public.cards_internos FROM anon, authenticated;

-- 5. Remove a coluna antiga: a partir daqui `select *` em cards e seguro.
ALTER TABLE public.cards DROP COLUMN IF EXISTS campos_internos;

COMMENT ON TABLE public.cards_internos IS
  'Campos internos do card (custo, horas, notas, outputs de IA). Isolada de `cards` porque RLS nao mascara colunas. Sem policy para anon/authenticated: acesso exclusivamente server-side via service role, apos a visibilidade da linha ja ter sido conferida na RLS de `cards`. Ver Regra #3 do CLAUDE.md.';
