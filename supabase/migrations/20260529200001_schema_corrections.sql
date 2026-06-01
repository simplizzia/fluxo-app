-- =============================================================================
-- Schema corrections: nullability and missing columns discovered during
-- TypeScript type-check fixes (Sprint 5.x post-MVP cleanup).
-- All statements are idempotent.
-- =============================================================================

-- cards.tipo_id and cards.cliente_id should be nullable FKs
-- (cards created via WhatsApp webhook may not have a client or type)
ALTER TABLE cards ALTER COLUMN tipo_id    DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN cliente_id DROP NOT NULL;

-- cards.criado_por should be optional (webhook/system-created cards have no user)
ALTER TABLE cards ALTER COLUMN criado_por DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN criado_por SET DEFAULT NULL;

-- organizacoes: limit and usage-control columns (Sprint 5.6)
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS limite_demandas integer;
