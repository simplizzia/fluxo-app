-- ===========================================================================
-- agent_runs.marca_id
-- 2026-07-24
--
-- Fecha o rastro de auditoria por marca. cards.marca_id e integracao_social.marca_id
-- ja existem (16/07); faltava a execucao de agente saber para qual marca gerou.
-- Sem isto nao da para responder "que conteudo a IA produziu para a Ehrmann",
-- so "para o cliente Trevo" — que agrega Trevo e Ehrmann.
-- ===========================================================================

ALTER TABLE agent_runs
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES onboarding_marcas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runs_marca
  ON agent_runs(organization_id, marca_id)
  WHERE marca_id IS NOT NULL;

COMMENT ON COLUMN agent_runs.marca_id IS
  'Marca (onboarding_marcas) para a qual esta execucao gerou conteudo. NULL = execucao sem marca (cliente sem hierarquia, ou agente nao marca-especifico).';
