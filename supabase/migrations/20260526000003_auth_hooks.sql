-- =============================================================================
-- Fluxo App — Auth Hooks, Profile Trigger, Rate Limiting
-- Sprint 0.2 | 2026-05-26
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES (complementam as de 000001)
-- ---------------------------------------------------------------------------

-- Retorna o id do profile do usuário autenticado
CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS uuid AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Retorna array de cliente_ids vinculados ao usuário (papel = cliente)
CREATE OR REPLACE FUNCTION auth_cliente_ids()
RETURNS uuid[] AS $$
  SELECT ARRAY_AGG(cliente_id)
  FROM contatos_cliente
  WHERE user_id = auth.uid() AND ativo = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- TRIGGER: criar profile automaticamente ao aceitar convite
--
-- O convite é disparado pela Server Action actionConvidarUsuario() que passa
-- nos user_metadata: { organization_id, papel, nome }.
-- Este trigger lê esses metadados e cria o profile correspondente.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id uuid;
  v_papel           papel_usuario;
  v_nome            text;
BEGIN
  v_organization_id := (NEW.raw_user_meta_data ->> 'organization_id')::uuid;
  v_papel           := (NEW.raw_user_meta_data ->> 'papel')::papel_usuario;
  v_nome            := COALESCE(
                         NEW.raw_user_meta_data ->> 'nome',
                         split_part(NEW.email, '@', 1)
                       );

  IF v_organization_id IS NOT NULL AND v_papel IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, organization_id, papel, nome)
    VALUES (NEW.id, v_organization_id, v_papel, v_nome)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- CUSTOM ACCESS TOKEN HOOK
--
-- Injeta organization_id e papel no JWT para uso nas RLS policies.
--
-- ⚠️  PASSO MANUAL OBRIGATÓRIO após rodar esta migration:
--   Supabase Dashboard → Authentication → Hooks
--   → Custom Access Token → selecionar: public.custom_access_token_hook
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims      jsonb;
  profile_row RECORD;
BEGIN
  claims := event -> 'claims';

  SELECT organization_id::text, papel::text
  INTO   profile_row
  FROM   public.profiles
  WHERE  user_id = (event ->> 'user_id')::uuid
  LIMIT  1;

  IF FOUND THEN
    claims := jsonb_set(claims, '{organization_id}', to_jsonb(profile_row.organization_id));
    claims := jsonb_set(claims, '{papel}',           to_jsonb(profile_row.papel));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permissões para o hook funcionar
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- RATE LIMITING DE LOGIN
--
-- Protege contra brute force. A função check_login_rate_limit() é chamada
-- pelo Server Action de login antes de chamar supabase.auth.signInWithPassword.
-- Limite padrão: 10 tentativas por 15 minutos por email ou IP.
-- ---------------------------------------------------------------------------

CREATE TABLE rate_limit_login (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   text        NOT NULL,  -- 'email:<email>' ou 'ip:<ip>'
  tentativa_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_recent
  ON rate_limit_login(identifier, tentativa_em DESC);

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  p_identifier     text,
  p_limit          int DEFAULT 10,
  p_window_minutes int DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count int;
BEGIN
  SELECT COUNT(*)
  INTO   attempt_count
  FROM   rate_limit_login
  WHERE  identifier   = p_identifier
    AND  tentativa_em > now() - (p_window_minutes || ' minutes')::interval;

  IF attempt_count >= p_limit THEN
    RETURN false;
  END IF;

  -- Registrar esta tentativa
  INSERT INTO rate_limit_login(identifier) VALUES (p_identifier);

  -- Limpar entradas antigas (> 24h) do mesmo identifier
  DELETE FROM rate_limit_login
  WHERE identifier   = p_identifier
    AND tentativa_em < now() - interval '24 hours';

  RETURN true;
END;
$$;

-- anon pode chamar (login acontece antes da sessão existir)
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit TO anon, authenticated;

-- Nenhuma policy = nenhum acesso direto à tabela (só via função SECURITY DEFINER)
ALTER TABLE rate_limit_login ENABLE ROW LEVEL SECURITY;
