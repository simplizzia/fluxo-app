-- =============================================================================
-- Patch: Add missing columns that were referenced in code but not in DB
-- =============================================================================

-- cards: concluido_em (when card reached status=concluido)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS concluido_em timestamptz;

-- Update trigger to set concluido_em when status → concluido
CREATE OR REPLACE FUNCTION fn_card_concluido_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'concluido'
    AND (OLD.status IS DISTINCT FROM 'concluido')
    AND NEW.concluido_em IS NULL
  THEN
    NEW.concluido_em = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_card_concluido_em ON cards;
CREATE TRIGGER trg_card_concluido_em
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION fn_card_concluido_em();

-- organizacoes: ativo flag
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- audit_log: detalhes jsonb for extra structured data
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS detalhes jsonb;

-- tipos_demanda: descricao text
ALTER TABLE tipos_demanda ADD COLUMN IF NOT EXISTS descricao text;

-- badges_conquistados: card_id (link the badge to the card that triggered it)
ALTER TABLE badges_conquistados ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES cards(id) ON DELETE SET NULL;
