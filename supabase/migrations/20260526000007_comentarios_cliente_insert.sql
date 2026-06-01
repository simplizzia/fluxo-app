-- =============================================================================
-- Migração 007 — Policy: cliente pode inserir comentários nos próprios cards
-- =============================================================================
-- Lacuna identificada em 000004: apenas equipe podia inserir comentários.
-- O cliente precisa comentar para dar feedback de aprovação/ajustes.
--
-- Restrições da policy:
--   • Só nos próprios cards (via auth_cliente_ids())
--   • Card não pode ser confidencial
--   • visivel_para_cliente obrigatoriamente true (redundante com a action,
--     mas garante segurança em caso de bypass direto via API)
-- =============================================================================

CREATE POLICY "comentarios_insert_cliente" ON comentarios
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND visivel_para_cliente = true
    AND card_id IN (
      SELECT id FROM cards
      WHERE cliente_id = ANY(auth_cliente_ids())
        AND organization_id = auth_organization_id()
        AND NOT confidencial
    )
  );
