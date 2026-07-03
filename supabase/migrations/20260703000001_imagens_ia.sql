-- =============================================================================
-- Fluxo App — Módulo de Produção de Imagem IA
-- 2026-07-03
--
-- Ferramenta interna de montagem de prompts fotorrealistas por composição:
-- Bloco Mestre (estilo fixo do cliente) + Ficha de Produto (geometria do SKU)
-- + Banco de Variações (atributos aprovados) + Patches Técnicos (snippets
-- globais) → prompt final para colar na ferramenta de geração externa.
--
-- Papéis: socia/gestao = admin (tudo, promoção na calibração, acessos);
--         atendimento/executor = produção (só clientes em imagens_acesso);
--         cliente = sem acesso (nenhuma policy).
--
-- Spec: docs/superpowers/specs/2026-07-03-imagens-ia-design.md
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------------

-- Quais usuários de produção acessam quais clientes no módulo
CREATE TABLE imagens_acesso (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  profile_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cliente_id      uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, cliente_id)
);

-- Regras fixas de estilo que entram em TODO prompt do cliente (1:1)
CREATE TABLE imagens_bloco_mestre (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id       uuid        NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  paleta_hex       text[]      NOT NULL DEFAULT '{}',
  regra_paleta     text,
  estilo_luz       text,
  sentimento_marca text,
  negativos_padrao text[]      NOT NULL DEFAULT '{}',
  formato_padrao   text        NOT NULL DEFAULT '4:5 vertical',
  estilo_geral     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Ficha de Produto: geometria e regras de cada SKU
CREATE TABLE imagens_produtos (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id             uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome                   text        NOT NULL,
  formato                text,
  escala_relativa        text,
  tampa                  text,
  regra_geracao          text,
  restricao_conteudo     text,
  alerta_contraste       text,
  -- valores: frontal | 3-4 | perfil | de-cima | sem-tampa
  angulos_disponiveis    text[]      NOT NULL DEFAULT '{}',
  imagem_referencia_path text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Categoria do Banco de Variações (ex: "casa/fachada", "roupa - avô")
CREATE TABLE imagens_categorias_variacao (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, tipo)
);

-- Atributo aprovado de uma categoria (cliente_id denormalizado p/ RLS simples)
CREATE TABLE imagens_variacao_atributos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id      uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  categoria_id    uuid        NOT NULL REFERENCES imagens_categorias_variacao(id) ON DELETE CASCADE,
  valor           text        NOT NULL,
  vezes_usado     integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'aprovado'
                              CHECK (status IN ('aprovado', 'testando', 'reprovado')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Personagem recorrente (mascote, avô da caneca) — consistência entre cenas
CREATE TABLE imagens_personagens (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id             uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome                   text        NOT NULL,
  descricao_fixa         text,
  imagem_referencia_path text,
  alerta_contaminacao    text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Cena: cada prompt montado — vira o Banco de Prompts do cliente
CREATE TABLE imagens_cenas (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cliente_id            uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  personagem_texto      text,
  personagem_id         uuid        REFERENCES imagens_personagens(id) ON DELETE SET NULL,
  acao_pose             text        NOT NULL,
  produto_id            uuid        REFERENCES imagens_produtos(id) ON DELETE SET NULL,
  variacao_atributo_id  uuid        REFERENCES imagens_variacao_atributos(id) ON DELETE SET NULL,
  formato               text,
  nota_especial         text,
  prompt_final          text        NOT NULL,
  negativos_final       text,
  ferramenta_recomendada text,
  status                text        NOT NULL DEFAULT 'rascunho'
                                    CHECK (status IN ('rascunho', 'testado_aprovado', 'testado_reprovado')),
  nota_regua            text,
  imagem_resultado_path text,
  criado_por            uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Caso de Calibração: erro real + correção — auto-aprendizado supervisionado
CREATE TABLE imagens_casos_calibracao (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  -- sempre preenchido (rastreabilidade de origem), mesmo em erro técnico universal
  cliente_id        uuid        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  cena_id           uuid        REFERENCES imagens_cenas(id) ON DELETE SET NULL,
  -- decisão manual obrigatória de quem registra — nunca inferido
  escopo_do_erro    text        NOT NULL
                                CHECK (escopo_do_erro IN ('tecnico_universal', 'especifico_do_cliente')),
  dimensao_regua    text,
  descricao_erro    text        NOT NULL,
  correcao_aplicada text,
  vezes_visto       integer     NOT NULL DEFAULT 1,
  status            text        NOT NULL DEFAULT 'candidato'
                                CHECK (status IN ('candidato', 'promovido', 'descartado')),
  -- ex: 'bloco_mestre' | 'ficha_produto:<uuid>' | 'patch_tecnico:<uuid>'
  promovido_para    text,
  promovido_por     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  promovido_em      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Patch Técnico: snippet global (por organização) para erros técnicos universais
CREATE TABLE imagens_patches_tecnicos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome            text        NOT NULL,
  quando_usar     text,
  snippet_texto   text        NOT NULL,
  -- usado pelo Montador para sugerir o patch quando a ação/pose contém a palavra
  palavras_chave  text[]      NOT NULL DEFAULT '{}',
  origem_caso_id  uuid        REFERENCES imagens_casos_calibracao(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_imagens_acesso_profile      ON imagens_acesso(profile_id);
CREATE INDEX idx_imagens_acesso_cliente      ON imagens_acesso(cliente_id);
CREATE INDEX idx_imagens_produtos_cliente    ON imagens_produtos(cliente_id);
CREATE INDEX idx_imagens_cat_var_cliente     ON imagens_categorias_variacao(cliente_id);
CREATE INDEX idx_imagens_var_attr_categoria  ON imagens_variacao_atributos(categoria_id);
CREATE INDEX idx_imagens_var_attr_cliente    ON imagens_variacao_atributos(cliente_id);
CREATE INDEX idx_imagens_personagens_cliente ON imagens_personagens(cliente_id);
CREATE INDEX idx_imagens_cenas_cliente       ON imagens_cenas(cliente_id, status);
CREATE INDEX idx_imagens_casos_cliente       ON imagens_casos_calibracao(cliente_id, status);

-- ---------------------------------------------------------------------------
-- TRIGGERS updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_imagens_bloco_mestre_updated BEFORE UPDATE ON imagens_bloco_mestre
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_imagens_produtos_updated BEFORE UPDATE ON imagens_produtos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_imagens_personagens_updated BEFORE UPDATE ON imagens_personagens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_imagens_cenas_updated BEFORE UPDATE ON imagens_cenas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_imagens_casos_updated BEFORE UPDATE ON imagens_casos_calibracao
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_imagens_patches_updated BEFORE UPDATE ON imagens_patches_tecnicos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: incrementar vezes_usado do atributo quando a cena é aprovada
-- Só na transição para 'testado_aprovado' (nunca em rascunho), para não
-- distorcer a lógica de não-repetição com tentativas descartadas.
-- SECURITY DEFINER: produção pode aprovar cena sem ter UPDATE em atributos.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION imagens_incrementa_vezes_usado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'testado_aprovado'
     AND OLD.status IS DISTINCT FROM 'testado_aprovado'
     AND NEW.variacao_atributo_id IS NOT NULL THEN
    UPDATE imagens_variacao_atributos
       SET vezes_usado = vezes_usado + 1
     WHERE id = NEW.variacao_atributo_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_imagens_cenas_aprovada
  AFTER UPDATE OF status ON imagens_cenas
  FOR EACH ROW EXECUTE FUNCTION imagens_incrementa_vezes_usado();

-- ---------------------------------------------------------------------------
-- HELPER: usuário de produção tem acesso ao cliente no módulo de imagens?
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION imagens_tem_acesso(p_cliente_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM imagens_acesso
    WHERE profile_id = auth_profile_id()
      AND cliente_id = p_cliente_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- RLS
-- Admin (socia/gestao): tudo. Produção (atendimento/executor): só clientes
-- liberados em imagens_acesso — lê tudo do cliente, escreve cenas e registra
-- casos, mas nunca promove regra nem edita bloco mestre/fichas/patches.
-- Papel cliente: nenhuma policy → banco retorna vazio.
-- ---------------------------------------------------------------------------

ALTER TABLE imagens_acesso              ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_bloco_mestre        ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_produtos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_categorias_variacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_variacao_atributos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_personagens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_cenas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_casos_calibracao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_patches_tecnicos    ENABLE ROW LEVEL SECURITY;

-- imagens_acesso: admin gerencia; produção lê as próprias linhas
CREATE POLICY "img_acesso_admin" ON imagens_acesso
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_acesso_select_proprio" ON imagens_acesso
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND profile_id = auth_profile_id()
  );

-- imagens_bloco_mestre
CREATE POLICY "img_bloco_admin" ON imagens_bloco_mestre
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_bloco_select_producao" ON imagens_bloco_mestre
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

-- imagens_produtos
CREATE POLICY "img_produtos_admin" ON imagens_produtos
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_produtos_select_producao" ON imagens_produtos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

-- imagens_categorias_variacao
CREATE POLICY "img_cat_var_admin" ON imagens_categorias_variacao
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_cat_var_select_producao" ON imagens_categorias_variacao
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

-- imagens_variacao_atributos
CREATE POLICY "img_var_attr_admin" ON imagens_variacao_atributos
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_var_attr_select_producao" ON imagens_variacao_atributos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

-- imagens_personagens
CREATE POLICY "img_personagens_admin" ON imagens_personagens
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_personagens_select_producao" ON imagens_personagens
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

-- imagens_cenas: produção lê e escreve nos clientes liberados
CREATE POLICY "img_cenas_admin" ON imagens_cenas
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_cenas_select_producao" ON imagens_cenas
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

CREATE POLICY "img_cenas_insert_producao" ON imagens_cenas
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

CREATE POLICY "img_cenas_update_producao" ON imagens_cenas
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

-- imagens_casos_calibracao: produção registra e atualiza casos candidatos
-- (incrementar vezes_visto), mas nunca muda status — promoção é só admin.
CREATE POLICY "img_casos_admin" ON imagens_casos_calibracao
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_casos_select_producao" ON imagens_casos_calibracao
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
  );

CREATE POLICY "img_casos_insert_producao" ON imagens_casos_calibracao
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
    AND status = 'candidato'
  );

CREATE POLICY "img_casos_update_producao" ON imagens_casos_calibracao
  FOR UPDATE TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
    AND status = 'candidato'
  )
  WITH CHECK (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
    AND imagens_tem_acesso(cliente_id)
    AND status = 'candidato'
  );

-- imagens_patches_tecnicos: leitura para toda a equipe interna; escrita admin
CREATE POLICY "img_patches_admin" ON imagens_patches_tecnicos
  FOR ALL TO authenticated
  USING (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'))
  WITH CHECK (organization_id = auth_organization_id() AND auth_papel() IN ('socia', 'gestao'));

CREATE POLICY "img_patches_select_equipe" ON imagens_patches_tecnicos
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() IN ('atendimento', 'executor')
  );

-- clientes: executor com acesso no módulo de imagens precisa ver o cliente
-- (a policy existente de executor só cobre clientes com cards atribuídos)
CREATE POLICY "clientes_select_imagens_acesso" ON clientes
  FOR SELECT TO authenticated
  USING (
    organization_id = auth_organization_id()
    AND auth_papel() = 'executor'
    AND imagens_tem_acesso(id)
  );

-- ---------------------------------------------------------------------------
-- SEED — Cliente Trevo (condicional: só se o cliente existir na base)
-- Dados reais validados em produção (spec seções 5.1–5.4)
-- ---------------------------------------------------------------------------

DO $seed$
DECLARE
  v_cliente_id uuid;
  v_org_id     uuid;
  v_cat_id     uuid;
BEGIN
  SELECT id, organization_id INTO v_cliente_id, v_org_id
  FROM clientes
  WHERE nome ILIKE 'trevo%'
  ORDER BY created_at
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'Seed imagens_ia: cliente Trevo não encontrado — seed ignorado.';
    RETURN;
  END IF;

  -- 5.1 Bloco Mestre
  INSERT INTO imagens_bloco_mestre (
    organization_id, cliente_id, paleta_hex, regra_paleta, estilo_luz,
    sentimento_marca, negativos_padrao, formato_padrao, estilo_geral
  ) VALUES (
    v_org_id, v_cliente_id,
    ARRAY['#E60031', '#D4001D', '#F8B800', '#FF6600', '#FF4B8B', '#92D0FF'],
    'Cor entra via objetos físicos (roupa, props, decoração, comida) — nunca como filtro ou color grading.',
    'Luz quente — golden hour ou luz de tarde/interior quente. Nunca luz fria, neutra ou azulada em nenhuma parte da cena.',
    'Humano, caseiro, afetivo, classe C1 brasileira — cuidado mas não luxuoso. Nunca: vitrine/fachada comercial, ambiente clínico/moderno-frio, pose de banco de imagem genérico, roupa social/alfaiataria em contexto doméstico.',
    ARRAY['waxy skin', 'plastic look', 'distorted hands', 'extra fingers',
          'missing fingers', 'fused fingers', 'perfect symmetry', 'stock photo pose',
          'oversaturated colors', 'harsh flash', 'cool/blue lighting',
          'text or logo on packaging', 'product label'],
    '4:5 vertical',
    'photorealistic, documentary-style, realistic skin texture with visible pores, natural asymmetry in pose and expression'
  )
  ON CONFLICT (cliente_id) DO NOTHING;

  -- 5.2 Fichas de Produto
  INSERT INTO imagens_produtos (
    organization_id, cliente_id, nome, formato, escala_relativa, tampa,
    regra_geracao, restricao_conteudo, alerta_contraste, angulos_disponiveis
  ) VALUES
    (v_org_id, v_cliente_id, 'Frutas 150g',
     'garrafa baixa/atarracada, corpo levemente cônico',
     'altura de palma, cabe na mão fechada', 'prateada, larga',
     'sempre sem rótulo, silhueta neutra; rótulo real é composto depois no Photoshop',
     NULL, NULL, ARRAY['frontal']),
    (v_org_id, v_cliente_id, 'Tripla Atitude 800g',
     'garrafa alta, leve "cintura"',
     '~2x a altura da 150g', 'roxa',
     'sempre sem rótulo, silhueta neutra; rótulo real é composto depois no Photoshop',
     NULL, NULL, ARRAY['frontal']),
    (v_org_id, v_cliente_id, 'Leite Fermentado Kids 75g',
     'garrafinha curta, corpo reto',
     'menor que a 150g', 'metálica prateada',
     'sempre sem rótulo, silhueta neutra; rótulo real é composto depois no Photoshop',
     NULL,
     'fundo vermelho puro "apaga" o produto — usar rim-light de contraste',
     ARRAY['frontal']),
    (v_org_id, v_cliente_id, 'Grego Pedaços Banana 400g',
     'pote cilíndrico reto (nunca tigela rasa)',
     'mais alto que largo, altura de mão adulta fechada', 'plástico transparente',
     'sempre sem rótulo, silhueta neutra; rótulo real é composto depois no Photoshop',
     'pedaços de banana PEQUENOS (cubos pequenos), nunca fatias grandes — risco de propaganda enganosa',
     NULL, ARRAY['frontal']),
    (v_org_id, v_cliente_id, 'Hello Kitty Pouch 90g',
     'pouch flexível, formato sachê',
     'tamanho de mão infantil', 'bico com tampa vermelha',
     'sempre sem rótulo, silhueta neutra; rótulo real é composto depois no Photoshop',
     NULL, NULL, ARRAY['frontal']);

  -- 5.3 Banco de Variações
  -- (v_cat_id zerado antes de cada categoria: com ON CONFLICT DO NOTHING o
  --  RETURNING não sobrescreve a variável, que reteria o valor anterior)
  v_cat_id := NULL;
  INSERT INTO imagens_categorias_variacao (organization_id, cliente_id, tipo)
  VALUES (v_org_id, v_cliente_id, 'Casa/fachada (classe C1)')
  ON CONFLICT (cliente_id, tipo) DO NOTHING
  RETURNING id INTO v_cat_id;

  IF v_cat_id IS NOT NULL THEN
    INSERT INTO imagens_variacao_atributos (organization_id, cliente_id, categoria_id, valor, vezes_usado) VALUES
      (v_org_id, v_cliente_id, v_cat_id, 'Fachada ocre-amarelo, grade de ferro ornamental simples, vaso de planta na soleira, porta de madeira envernizada escura', 1),
      (v_org_id, v_cliente_id, v_cat_id, 'Fachada terracota claro, grade vertical com detalhe no topo, capacho na entrada, porta clara', 0),
      (v_org_id, v_cliente_id, v_cat_id, 'Fachada bege-areia, grade em losango, cortina visível na janela, porta pintada', 0),
      (v_org_id, v_cliente_id, v_cat_id, 'Fachada verde-oliva claro, grade ornamental simples, varal visível ao fundo, porta de madeira clara', 0);
  END IF;

  v_cat_id := NULL;
  INSERT INTO imagens_categorias_variacao (organization_id, cliente_id, tipo)
  VALUES (v_org_id, v_cliente_id, 'Roupa — mulher jovem indo trabalhar')
  ON CONFLICT (cliente_id, tipo) DO NOTHING
  RETURNING id INTO v_cat_id;
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO imagens_variacao_atributos (organization_id, cliente_id, categoria_id, valor, vezes_usado) VALUES
      (v_org_id, v_cliente_id, v_cat_id, 'Blusa manga longa vinho, jeans, tênis vermelho sem logo', 1);
  END IF;

  v_cat_id := NULL;
  INSERT INTO imagens_categorias_variacao (organization_id, cliente_id, tipo)
  VALUES (v_org_id, v_cliente_id, 'Roupa — avô')
  ON CONFLICT (cliente_id, tipo) DO NOTHING
  RETURNING id INTO v_cat_id;
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO imagens_variacao_atributos (organization_id, cliente_id, categoria_id, valor, vezes_usado) VALUES
      (v_org_id, v_cliente_id, v_cat_id, 'Polo casual tijolo, calça confortável', 1);
  END IF;

  v_cat_id := NULL;
  INSERT INTO imagens_categorias_variacao (organization_id, cliente_id, tipo)
  VALUES (v_org_id, v_cliente_id, 'Roupa — avó')
  ON CONFLICT (cliente_id, tipo) DO NOTHING
  RETURNING id INTO v_cat_id;
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO imagens_variacao_atributos (organization_id, cliente_id, categoria_id, valor, vezes_usado) VALUES
      (v_org_id, v_cliente_id, v_cat_id, 'Tricô/blusa mostarda, casual', 1);
  END IF;

  v_cat_id := NULL;
  INSERT INTO imagens_categorias_variacao (organization_id, cliente_id, tipo)
  VALUES (v_org_id, v_cliente_id, 'Roupa — homem jovem solteiro')
  ON CONFLICT (cliente_id, tipo) DO NOTHING
  RETURNING id INTO v_cat_id;
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO imagens_variacao_atributos (organization_id, cliente_id, categoria_id, valor, vezes_usado) VALUES
      (v_org_id, v_cliente_id, v_cat_id, 'Camiseta tijolo, shorts/jogger, descalço/meias', 1);
  END IF;

  -- 5.4 Personagem recorrente
  INSERT INTO imagens_personagens (organization_id, cliente_id, nome, descricao_fixa)
  VALUES (
    v_org_id, v_cliente_id,
    'Avô — carrossel família',
    'Caneca vermelha cerâmica específica dele, com desgaste sutil no esmalte (não nova, não danificada) — sempre segurada pela alça, dedos passando pelo vão, nunca pelo corpo da caneca.'
  );

  -- Patch técnico inicial (biblioteca global da organização)
  INSERT INTO imagens_patches_tecnicos (organization_id, nome, quando_usar, snippet_texto, palavras_chave)
  VALUES (
    v_org_id,
    'mão-em-alça',
    'sempre que a pose envolve segurar objeto com alça, tipo caneca ou xícara',
    'fingers curl through the open handle loop, not gripping the round body of the mug',
    ARRAY['caneca', 'xícara', 'xicara', 'alça', 'alca', 'mug', 'cup']
  );

  RAISE NOTICE 'Seed imagens_ia: dados da Trevo inseridos com sucesso.';
END;
$seed$;

-- Tipos de database.ts atualizados manualmente nesta mesma mudança
-- (regenerar via npm run db:types após aplicar em staging/prod).
