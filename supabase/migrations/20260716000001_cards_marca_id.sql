-- ============================================================================
-- cards.marca_id
-- 2026-07-16
--
-- Causa raiz da mistura de marcas em prompts de IA: cards não tinham vínculo
-- estrutural com onboarding_marcas, só cliente_id. buildContextoCliente()
-- (src/lib/agents/executor.ts) já sabe escopar contexto por marca + marca-mãe,
-- mas nunca recebia marcaId de um card real e caía no fallback "traz tudo do
-- cliente" — misturando todas as marcas do cliente em todo prompt.
-- ============================================================================

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cards_marca
  ON cards(marca_id)
  WHERE marca_id IS NOT NULL;

COMMENT ON COLUMN cards.marca_id IS
  'Marca (onboarding_marcas) à qual esta demanda pertence. NULL = cliente sem hierarquia de marcas ou card legado. Obrigatório na camada de aplicação para tipos_demanda de categoria redes_sociais/linkedin/trafego quando o cliente tem marcas cadastradas — ver actionCriarCard em src/app/(dashboard)/board/actions.ts.';
