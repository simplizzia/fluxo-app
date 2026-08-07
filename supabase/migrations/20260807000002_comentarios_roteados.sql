-- ===========================================================================
-- Comentarios roteados — executor so ve o que e direcionado a ele
-- 2026-08-07
--
-- Decisao de produto (redesenho do card): a troca com o cliente e a triagem
-- interna ficam com lideres (socia/gestao/atendimento); o executor (designer,
-- apoio) NAO ve o thread do cliente nem a conversa interna geral — so ve os
-- comentarios INTERNOS direcionados a ele. Quem precisa que o executor aja
-- direciona o comentario a ele (o atendimento repassa a tarefa limpa).
--
-- Eixo Cliente x Interno continua no boolean visivel_para_cliente (o RLS do
-- cliente ja o usa). O roteamento interno entra em direcionado_a (uuid[]).
--
-- Seguranca no BANCO (RLS), nunca no frontend. Migration de schema
-- (nova coluna) -> precisa de `npm run db:types` depois do push.
-- ===========================================================================

ALTER TABLE comentarios
  ADD COLUMN IF NOT EXISTS direcionado_a uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN comentarios.direcionado_a IS
  'Profiles a quem um comentario INTERNO e direcionado. Vazio = geral (so lideres veem). Executor so ve comentario interno em que esta listado aqui (ou de sua autoria).';

-- ---------------------------------------------------------------------------
-- SELECT — substitui a policy unica da equipe por duas: lideres x executor.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "comentarios_select_equipe" ON comentarios;

-- Lideres (socia/gestao/atendimento): veem TODOS os comentarios dos cards a que
-- tem acesso. Sao a triagem.
CREATE POLICY "comentarios_select_lideres" ON comentarios
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- Executor: SO comentario interno direcionado a ele (ou de sua autoria), e SO
-- nos cards atribuidos a ele. Nunca o thread do cliente.
CREATE POLICY "comentarios_select_executor" ON comentarios
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'executor'
    AND visivel_para_cliente = false
    AND (
      auth_profile_id() = ANY(direcionado_a)
      OR autor_id = auth_profile_id()
    )
    AND card_id IN (
      SELECT id FROM cards
      WHERE responsavel_id = auth_profile_id()
        AND organization_id = auth_organization_id()
    )
  );

-- (comentarios_select_cliente permanece inalterado — cliente nunca ve interno.)

-- ---------------------------------------------------------------------------
-- INSERT — executor so posta comentario INTERNO; lideres postam qualquer.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "comentarios_insert_equipe" ON comentarios;

CREATE POLICY "comentarios_insert_equipe" ON comentarios
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND (
      auth_papel() IN ('socia', 'gestao', 'atendimento')
      OR (auth_papel() = 'executor' AND visivel_para_cliente = false)
    )
  );
