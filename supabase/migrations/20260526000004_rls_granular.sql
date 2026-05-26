-- =============================================================================
-- Fluxo App — RLS Granular por Papel
-- Sprint 0.2 | 2026-05-26
--
-- Substitui as policies placeholder do Sprint 0.1.
-- Cada tabela tem policies separadas por operação e por papel.
--
-- Papéis: socia | gestao | atendimento | executor | cliente
-- Regra base obrigatória: AND organization_id = auth_organization_id()
-- =============================================================================

-- ---------------------------------------------------------------------------
-- REMOVER POLICIES PLACEHOLDER (Sprint 0.1)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "clientes_org"         ON clientes;
DROP POLICY IF EXISTS "planos_org"           ON planos_cliente;
DROP POLICY IF EXISTS "contatos_org"         ON contatos_cliente;
DROP POLICY IF EXISTS "tipos_demanda_org"    ON tipos_demanda;
DROP POLICY IF EXISTS "cards_org"            ON cards;
DROP POLICY IF EXISTS "comentarios_org"      ON comentarios;
DROP POLICY IF EXISTS "arquivos_org"         ON arquivos;
DROP POLICY IF EXISTS "aprovacoes_org"       ON aprovacoes;
DROP POLICY IF EXISTS "card_history_org"     ON card_status_history;
DROP POLICY IF EXISTS "universo_marca_org"   ON universo_marca;
DROP POLICY IF EXISTS "ident_visual_org"     ON identidade_visual_ativos;
DROP POLICY IF EXISTS "moodboard_org"        ON moodboard_items;
DROP POLICY IF EXISTS "interacoes_prospect_org" ON interacoes_prospect;
DROP POLICY IF EXISTS "reunioes_org"         ON reunioes;
DROP POLICY IF EXISTS "action_items_org"     ON action_items_reuniao;

-- ---------------------------------------------------------------------------
-- VIEW: cards_safe
--
-- Protege campos_internos por papel — campo retorna NULL para cliente.
-- Use sempre esta view nas queries de aplicação, nunca a tabela direta.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW cards_safe
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  id, organization_id, cliente_id, tipo_id, responsavel_id, criado_por,
  status, prioridade, titulo, confidencial, prazo_cliente, prazo_interno,
  data_publicacao, campos_publicos, rodadas_revisao, versao_entrega_atual,
  motivo_cancelamento, created_at, updated_at,
  CASE
    WHEN auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
    THEN campos_internos
    ELSE NULL::jsonb
  END AS campos_internos
FROM cards;

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------

-- socia / gestao / atendimento: ver todos os clientes da organização
CREATE POLICY "clientes_select_equipe" ON clientes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- executor: ver apenas clientes que têm cards atribuídos a ele
CREATE POLICY "clientes_select_executor" ON clientes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'executor'
    AND id IN (
      SELECT DISTINCT c.cliente_id FROM cards c
      WHERE c.responsavel_id = auth_profile_id()
        AND c.organization_id = auth_organization_id()
    )
  );

-- cliente: ver apenas o próprio cliente
CREATE POLICY "clientes_select_cliente" ON clientes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND id = ANY(auth_cliente_ids())
  );

-- socia / atendimento: criar clientes
CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

-- socia: atualizar e remover clientes
CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

CREATE POLICY "clientes_delete" ON clientes
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- planos_cliente
-- ---------------------------------------------------------------------------

CREATE POLICY "planos_select_equipe" ON planos_cliente
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "planos_select_cliente" ON planos_cliente
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND cliente_id = ANY(auth_cliente_ids())
  );

CREATE POLICY "planos_write_socia" ON planos_cliente
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- contatos_cliente
-- ---------------------------------------------------------------------------

CREATE POLICY "contatos_select_equipe" ON contatos_cliente
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- cliente: ver apenas seus próprios registros de contato
CREATE POLICY "contatos_select_proprio" ON contatos_cliente
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "contatos_write_socia" ON contatos_cliente
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- tipos_demanda: todos leem, socia escreve
-- ---------------------------------------------------------------------------

CREATE POLICY "tipos_demanda_select" ON tipos_demanda
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id());

CREATE POLICY "tipos_demanda_write_socia" ON tipos_demanda
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- cards
--
-- NOTA: a coluna campos_internos é filtrada pela view cards_safe.
-- Use cards_safe nas queries da aplicação.
-- Aqui protegemos no nível de linha (por papel e confidencialidade).
-- ---------------------------------------------------------------------------

-- socia: todos os cards (incluindo confidenciais)
CREATE POLICY "cards_select_socia" ON cards
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- gestao: todos os cards não confidenciais
CREATE POLICY "cards_select_gestao" ON cards
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'gestao'
    AND NOT confidencial
  );

-- atendimento: todos os cards não confidenciais
CREATE POLICY "cards_select_atendimento" ON cards
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'atendimento'
    AND NOT confidencial
  );

-- executor: apenas cards atribuídos a ele
CREATE POLICY "cards_select_executor" ON cards
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'executor'
    AND responsavel_id = auth_profile_id()
  );

-- cliente: apenas cards do próprio cliente, não confidenciais
CREATE POLICY "cards_select_cliente" ON cards
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND cliente_id = ANY(auth_cliente_ids())
    AND NOT confidencial
  );

-- INSERT: socia, atendimento (em nome do cliente), cliente (próprios)
CREATE POLICY "cards_insert_equipe" ON cards
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

CREATE POLICY "cards_insert_cliente" ON cards
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND cliente_id = ANY(auth_cliente_ids())
  );

-- UPDATE: socia (sem restrição), equipe (não confidenciais), executor (só os seus)
CREATE POLICY "cards_update_socia" ON cards
  FOR UPDATE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY "cards_update_equipe" ON cards
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('gestao', 'atendimento')
    AND NOT confidencial
  )
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY "cards_update_executor" ON cards
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'executor'
    AND responsavel_id = auth_profile_id()
  )
  WITH CHECK (organization_id = auth_organization_id());

-- DELETE: socia apenas
CREATE POLICY "cards_delete" ON cards
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- comentarios
-- ---------------------------------------------------------------------------

-- equipe: vê todos os comentários dos cards que já tem acesso
CREATE POLICY "comentarios_select_equipe" ON comentarios
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- cliente: vê apenas comentários marcados como visíveis + do próprio cliente
CREATE POLICY "comentarios_select_cliente" ON comentarios
  FOR SELECT TO authenticated
  USING (
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

-- equipe pode comentar
CREATE POLICY "comentarios_insert_equipe" ON comentarios
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- autor pode editar o próprio comentário
CREATE POLICY "comentarios_update_autor" ON comentarios
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND autor_id = auth_profile_id()
  );

-- socia pode deletar qualquer comentário
CREATE POLICY "comentarios_delete" ON comentarios
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- arquivos
-- ---------------------------------------------------------------------------

-- equipe: todos os arquivos dos cards que têm acesso
CREATE POLICY "arquivos_select_equipe" ON arquivos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- cliente: apenas arquivos dos seus cards (não confidenciais)
CREATE POLICY "arquivos_select_cliente" ON arquivos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND card_id IN (
      SELECT id FROM cards
      WHERE cliente_id = ANY(auth_cliente_ids())
        AND organization_id = auth_organization_id()
        AND NOT confidencial
    )
  );

-- equipe pode fazer upload
CREATE POLICY "arquivos_insert" ON arquivos
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- socia pode deletar
CREATE POLICY "arquivos_delete" ON arquivos
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- aprovacoes
-- ---------------------------------------------------------------------------

-- equipe vê todas as aprovações
CREATE POLICY "aprovacoes_select_equipe" ON aprovacoes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- cliente vê aprovações dos seus cards
CREATE POLICY "aprovacoes_select_cliente" ON aprovacoes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND card_id IN (
      SELECT id FROM cards
      WHERE cliente_id = ANY(auth_cliente_ids())
        AND organization_id = auth_organization_id()
    )
  );

-- equipe faz aprovações internas (interna = true)
CREATE POLICY "aprovacoes_insert_equipe" ON aprovacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- cliente-responsavel faz aprovação externa (interna = false)
-- sub_papel = responsavel é verificado na aplicação
CREATE POLICY "aprovacoes_insert_cliente" ON aprovacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND card_id IN (
      SELECT id FROM cards
      WHERE cliente_id = ANY(auth_cliente_ids())
        AND organization_id = auth_organization_id()
        AND status = 'para_aprovacao'
    )
  );

-- ---------------------------------------------------------------------------
-- card_status_history
-- ---------------------------------------------------------------------------

CREATE POLICY "card_history_equipe" ON card_status_history
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

CREATE POLICY "card_history_cliente" ON card_status_history
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND card_id IN (
      SELECT id FROM cards
      WHERE cliente_id = ANY(auth_cliente_ids())
        AND organization_id = auth_organization_id()
        AND NOT confidencial
    )
  );

-- INSERT via servidor (automação/app) — verificado pelo org
CREATE POLICY "card_history_insert" ON card_status_history
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id());

-- ---------------------------------------------------------------------------
-- universo_marca
-- ---------------------------------------------------------------------------

-- equipe vê tudo
CREATE POLICY "universo_select_equipe" ON universo_marca
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- cliente vê apenas o que está marcado como visível
CREATE POLICY "universo_select_cliente" ON universo_marca
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND visivel_para_cliente = true
    AND cliente_id = ANY(auth_cliente_ids())
  );

-- socia e gestao (Caio) escrevem
CREATE POLICY "universo_write" ON universo_marca
  FOR ALL TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao')
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao')
  );

-- ---------------------------------------------------------------------------
-- identidade_visual_ativos
-- ---------------------------------------------------------------------------

CREATE POLICY "ident_select_equipe" ON identidade_visual_ativos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- cliente vê os ativos marcados como visíveis (exceto arquivo_fonte)
CREATE POLICY "ident_select_cliente" ON identidade_visual_ativos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND visivel_para_cliente = true
    AND categoria != 'arquivo_fonte'
    AND cliente_id = ANY(auth_cliente_ids())
  );

CREATE POLICY "ident_write" ON identidade_visual_ativos
  FOR ALL TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao')
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao')
  );

-- ---------------------------------------------------------------------------
-- moodboard_items
-- ---------------------------------------------------------------------------

CREATE POLICY "moodboard_select_equipe" ON moodboard_items
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento', 'executor')
  );

-- cliente vê o moodboard do próprio cliente (read-only elegante)
CREATE POLICY "moodboard_select_cliente" ON moodboard_items
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'cliente'
    AND cliente_id = ANY(auth_cliente_ids())
  );

CREATE POLICY "moodboard_write" ON moodboard_items
  FOR ALL TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao')
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao')
  );

-- ---------------------------------------------------------------------------
-- reunioes — equipe interna apenas
-- ---------------------------------------------------------------------------

CREATE POLICY "reunioes_select" ON reunioes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "reunioes_insert" ON reunioes
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "reunioes_update" ON reunioes
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "reunioes_delete" ON reunioes
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- action_items_reuniao
-- ---------------------------------------------------------------------------

CREATE POLICY "action_items_select" ON action_items_reuniao
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "action_items_insert" ON action_items_reuniao
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "action_items_update" ON action_items_reuniao
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- ---------------------------------------------------------------------------
-- interacoes_prospect
-- ---------------------------------------------------------------------------

-- socia: acesso completo
-- atendimento: pode registrar notas/reuniões (não vê financeiro — controlado na app)
CREATE POLICY "interacoes_select" ON interacoes_prospect
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

CREATE POLICY "interacoes_insert" ON interacoes_prospect
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

CREATE POLICY "interacoes_delete" ON interacoes_prospect
  FOR DELETE TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- padroes_cliente — gerado pelo sistema, lido pela equipe
-- ---------------------------------------------------------------------------

CREATE POLICY "padroes_select" ON padroes_cliente
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

-- ---------------------------------------------------------------------------
-- health_scores — calculado pelo sistema, lido por socia e atendimento
-- ---------------------------------------------------------------------------

CREATE POLICY "health_select" ON health_scores
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

-- ---------------------------------------------------------------------------
-- avaliacoes_cliente
-- ---------------------------------------------------------------------------

-- socia e atendimento veem respostas
CREATE POLICY "aval_cliente_select" ON avaliacoes_cliente
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

-- socia cria o registro de avaliação (disparo)
CREATE POLICY "aval_cliente_insert" ON avaliacoes_cliente
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- UPDATE via token único (sem login) — rota pública usa service_role

-- ---------------------------------------------------------------------------
-- automation_rules — socia escreve, equipe lê
-- ---------------------------------------------------------------------------

CREATE POLICY "automation_rules_select" ON automation_rules
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'gestao', 'atendimento')
  );

CREATE POLICY "automation_rules_write" ON automation_rules
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- automation_logs — socia e atendimento leem
-- ---------------------------------------------------------------------------

CREATE POLICY "automation_logs_select" ON automation_logs
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('socia', 'atendimento')
  );

-- ---------------------------------------------------------------------------
-- badges_definicoes — todos leem, socia escreve
-- ---------------------------------------------------------------------------

CREATE POLICY "badges_def_select" ON badges_definicoes
  FOR SELECT TO authenticated
  USING (organization_id = auth_organization_id());

CREATE POLICY "badges_def_write" ON badges_definicoes
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND is_socia())
  WITH CHECK (organization_id = auth_organization_id() AND is_socia());

-- ---------------------------------------------------------------------------
-- badges_conquistados — usuário vê os seus
-- ---------------------------------------------------------------------------

CREATE POLICY "badges_conq_select" ON badges_conquistados
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND (
      usuario_id = auth_profile_id()
      OR is_socia()
    )
  );

-- ---------------------------------------------------------------------------
-- pontuacao_mensal — usuário vê a sua, socia vê todas
-- ---------------------------------------------------------------------------

CREATE POLICY "pontuacao_select" ON pontuacao_mensal
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND (
      usuario_id = auth_profile_id()
      OR is_socia()
    )
  );
