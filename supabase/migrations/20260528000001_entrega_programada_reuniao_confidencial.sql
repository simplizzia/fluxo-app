-- =============================================================================
-- Entrega programada em cards + Reuniões confidenciais
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cards: data de entrega programada ao cliente
-- ---------------------------------------------------------------------------

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS data_entrega_programada timestamptz;

COMMENT ON COLUMN cards.data_entrega_programada IS
  'Data/hora em que o card deve ir automaticamente para para_aprovacao. '
  'Visível ao cliente como "Previsão de entrega". Nulo = sem agendamento.';

CREATE INDEX IF NOT EXISTS idx_cards_entrega_programada
  ON cards(organization_id, data_entrega_programada)
  WHERE data_entrega_programada IS NOT NULL
    AND status NOT IN ('para_aprovacao', 'concluido', 'cancelado');

-- ---------------------------------------------------------------------------
-- 2. Reuniões: flag de confidencialidade
-- ---------------------------------------------------------------------------

ALTER TABLE reunioes
  ADD COLUMN IF NOT EXISTS confidencial boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN reunioes.confidencial IS
  'Quando true, apenas sócias têm acesso. '
  'Atendimento e gestão não veem nem via API direta (RLS).';

-- ---------------------------------------------------------------------------
-- 3. RLS: reuniões confidenciais — somente sócias
-- ---------------------------------------------------------------------------

-- Remove a policy genérica de reuniões (se existir) e recria com filtro
DROP POLICY IF EXISTS "reunioes_equipe_select" ON reunioes;
DROP POLICY IF EXISTS "reunioes_org_select" ON reunioes;
DROP POLICY IF EXISTS "reunioes_select" ON reunioes;

-- Política de leitura: socias veem tudo; outros só veem não-confidenciais
CREATE POLICY "reunioes_select" ON reunioes
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND (
      is_socia()
      OR confidencial = false
    )
  );

-- Política de insert: somente equipe (não clientes)
DROP POLICY IF EXISTS "reunioes_insert" ON reunioes;
CREATE POLICY "reunioes_insert" ON reunioes
  FOR INSERT WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- Política de update: somente equipe
DROP POLICY IF EXISTS "reunioes_update" ON reunioes;
CREATE POLICY "reunioes_update" ON reunioes
  FOR UPDATE USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
    AND (is_socia() OR confidencial = false)
  );

-- Política de delete: somente sócias
DROP POLICY IF EXISTS "reunioes_delete" ON reunioes;
CREATE POLICY "reunioes_delete" ON reunioes
  FOR DELETE USING (
    organization_id = auth_organization_id()
    AND is_socia()
  );

-- Action items de reuniões confidenciais: apenas sócias
DROP POLICY IF EXISTS "action_items_select" ON action_items_reuniao;
CREATE POLICY "action_items_select" ON action_items_reuniao
  FOR SELECT USING (
    organization_id = auth_organization_id()
    AND (
      is_socia()
      OR NOT EXISTS (
        SELECT 1 FROM reunioes r
        WHERE r.id = action_items_reuniao.reuniao_id
          AND r.confidencial = true
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. pg_cron: flip automático de cards com entrega programada
--    (requer extensão pg_cron habilitada no Supabase)
-- ---------------------------------------------------------------------------

-- Descomente ao fazer deploy em produção:

-- SELECT cron.schedule(
--   'cards-entrega-programada',
--   '*/5 * * * *',   -- a cada 5 minutos
--   $$
--     UPDATE cards
--     SET status = 'para_aprovacao',
--         updated_at = now()
--     WHERE data_entrega_programada <= now()
--       AND status IN ('a_fazer', 'em_andamento', 'aguardando_info')
--       AND data_entrega_programada IS NOT NULL;
--   $$
-- );
