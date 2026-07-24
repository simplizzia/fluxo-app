-- ===========================================================================
-- Fecha acesso publico cross-tenant e escalacao de privilegio
-- 2026-07-24
--
-- Oito policies concedem acesso a role PUBLIC — ou seja, a `anon` (chave
-- publica do navegador) e a `authenticated`. O Supabase concede DML em
-- `public` para essas roles por padrao, entao `USING (true)` sem clausula TO
-- libera geral, atravessando organizacoes.
--
-- Confirmado em producao em 2026-07-24, com a chave anon e SEM login:
--   onboarding_clientes -> 1 linha real retornada
--   onboarding_marcas   -> 1 linha real retornada
--
-- Todas se chamam `*_service_*` e o comentario original dizia "service role".
-- A intencao era restringir a essa role. A correcao NAO e acrescentar
-- `TO service_role`: no Supabase, `service_role` tem BYPASSRLS e ignora
-- policies por completo, entao estas policies nunca foram necessarias para
-- ele. Sao removidas.
--
-- Verificado antes de remover, para nao tirar leitura de ninguem:
--   - onboarding_clientes e onboarding_marcas mantem `*_equipe_select`,
--     escopada por organization_id = auth_organization_id().
--   - onboarding_mensagens e onboarding_feedback ficam SEM policy — negacao
--     por padrao. Sao tocadas apenas por src/app/api/onboarding/*, que usa
--     createServiceClient(). Nenhuma action do dashboard as le via RLS.
--   - whatsapp_mensagens mantem `whatsapp_socia_read`.
--   - badges_conquistados e pontuacao_mensal mantem `*_socia_read` e `*_self`.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Onboarding — o vazamento confirmado
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "onb_cli_service_all"    ON onboarding_clientes;
DROP POLICY IF EXISTS "onb_msg_service_all"    ON onboarding_mensagens;
DROP POLICY IF EXISTS "onb_fb_service_all"     ON onboarding_feedback;
DROP POLICY IF EXISTS "onb_marcas_service_all" ON onboarding_marcas;

-- ---------------------------------------------------------------------------
-- 2. WhatsApp e gamificacao
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "whatsapp_service_insert"     ON whatsapp_mensagens;
DROP POLICY IF EXISTS "whatsapp_service_update"     ON whatsapp_mensagens;
DROP POLICY IF EXISTS "badges_conq_service_insert"  ON badges_conquistados;
DROP POLICY IF EXISTS "pontuacao_service_upsert"    ON pontuacao_mensal;

-- ---------------------------------------------------------------------------
-- 3. NPS — policy redundante e que so aumenta superficie
--    O fluxo publico de avaliacao (src/app/avaliacoes/[token]/) usa
--    createServiceClient(). Esta policy permitia a QUALQUER UM sobrescrever
--    a resposta de NPS de qualquer cliente, bastando que o token nao fosse nulo.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "aval_cliente_token" ON avaliacoes_cliente;

-- ---------------------------------------------------------------------------
-- 4. Escalacao de privilegio no proprio perfil
--    `profiles_update_own` tinha USING mas nao WITH CHECK, entao o usuario
--    podia alterar o proprio `papel` (para socia) e o proprio
--    `organization_id` com um PATCH direto no PostgREST.
--    auth_papel() e auth_organization_id() sao SECURITY DEFINER e por isso
--    nao recursam ao serem usadas em uma policy sobre profiles.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND papel = auth_papel()
    AND organization_id = auth_organization_id()
  );

COMMENT ON POLICY "profiles_update_own" ON profiles IS
  'Usuario edita o proprio perfil, exceto papel e organization_id — fixados pelo WITH CHECK. Mudanca de papel e feita por socia via admin/usuarios.';

-- ---------------------------------------------------------------------------
-- 5. Storage: bucket `avisos`
--    O upload e feito por service role em socias/pessoas/actions.ts, no caminho
--    avisos/{organization_id}/{ts}.{ext}. A policy de INSERT para
--    `authenticated` permitia que QUALQUER usuario logado — inclusive um
--    `cliente` — gravasse no bucket. Nenhum caminho da aplicacao depende dela.
--
--    A leitura permanece aberta: o bucket foi criado com public = true de
--    proposito, para que a imagem do aviso apareca no popup sem autenticacao.
--    Isso e decisao de produto, nao falha; a policy de SELECT e apenas
--    redundante com o bucket publico e fica como esta.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "autenticado_upload_avisos" ON storage.objects;
