-- =============================================================================
-- Sprint 5.1 — SLA por Demanda
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SLA configurável por tipo de demanda
-- ---------------------------------------------------------------------------

ALTER TABLE tipos_demanda
  ADD COLUMN IF NOT EXISTS sla_prazo_inicio_horas    int,
  ADD COLUMN IF NOT EXISTS sla_prazo_resposta_horas  int,
  ADD COLUMN IF NOT EXISTS sla_ativo                 boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tipos_demanda.sla_prazo_inicio_horas IS
  'Horas máximas para equipe iniciar produção após card ser criado. '
  'Nulo = sem SLA de início.';

COMMENT ON COLUMN tipos_demanda.sla_prazo_resposta_horas IS
  'Horas máximas para ir a para_aprovacao após entrar em em_andamento. '
  'Nulo = sem SLA de resposta.';

COMMENT ON COLUMN tipos_demanda.sla_ativo IS
  'Habilita monitoramento de SLA para este tipo de demanda.';

-- ---------------------------------------------------------------------------
-- 2. Rastreamento de timestamps SLA em cards
-- ---------------------------------------------------------------------------

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS sla_iniciado_em   timestamptz,
  ADD COLUMN IF NOT EXISTS sla_respondido_em timestamptz;

COMMENT ON COLUMN cards.sla_iniciado_em IS
  'Quando o card entrou em em_andamento pela primeira vez. '
  'Ponto de início para o SLA de resposta.';

COMMENT ON COLUMN cards.sla_respondido_em IS
  'Quando o card entrou em para_aprovacao pela primeira vez. '
  'Ponto de fim para o SLA de resposta.';

-- ---------------------------------------------------------------------------
-- 3. Trigger: captura timestamps automaticamente nas transições de status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sla_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Registra quando entrou em produção pela primeira vez
  IF NEW.status = 'em_andamento'
    AND (OLD.status IS DISTINCT FROM 'em_andamento')
    AND NEW.sla_iniciado_em IS NULL
  THEN
    NEW.sla_iniciado_em = now();
  END IF;

  -- Registra quando foi enviado para aprovação pela primeira vez
  IF NEW.status = 'para_aprovacao'
    AND (OLD.status IS DISTINCT FROM 'para_aprovacao')
    AND NEW.sla_respondido_em IS NULL
  THEN
    NEW.sla_respondido_em = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sla_timestamps ON cards;
CREATE TRIGGER trg_sla_timestamps
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION fn_sla_timestamps();

-- ---------------------------------------------------------------------------
-- 4. Índices para o cron de monitoramento
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_cards_sla_ativo
  ON cards(organization_id, status, sla_iniciado_em)
  WHERE status IN ('em_andamento', 'a_fazer', 'aguardando_info');
