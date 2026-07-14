-- ============================================================================
-- Guia de Interação em Redes Sociais — novo agente (Time 3: Inteligência)
-- 2026-07-14
-- ============================================================================
-- Gera um guia estático de orientação para responder comentários e DMs em
-- nome de uma marca, alinhado a tom de voz e campanha ativa (injetados
-- automaticamente pelo contexto do executor) e a exemplos reais fornecidos
-- pela equipe. Ver docs/superpowers/specs/2026-07-14-guia-interacao-social-design.md.

-- ---------------------------------------------------------------------------
-- 1. Tipo de demanda
-- ---------------------------------------------------------------------------

INSERT INTO tipos_demanda (organization_id, nome, slug, categoria, tem_publicacao, campos_formulario, agente_slug) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Guia de Interação em Redes Sociais',
  'guia-interacao-social',
  'estrategia',
  false,
  '[
    {"nome":"marca","rotulo":"Marca","tipo":"text","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Nome da marca"},
    {"nome":"canais_ativos","rotulo":"Canais ativos","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":true,"placeholder":"Em quais redes a marca está presente e recebe comentários/DMs (Instagram, LinkedIn, TikTok, WhatsApp Business...)"},
    {"nome":"valores_e_temas_sensiveis","rotulo":"Valores e temas sensíveis","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"O que a marca nunca deve dizer: temas proibidos, concorrentes a não citar, posicionamentos delicados"},
    {"nome":"categorias_adicionais","rotulo":"Categorias adicionais de situação","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Situações específicas deste cliente além da lista padrão (elogio, dúvida, reclamação, crise, spam, oportunidade comercial, brincadeira, pergunta técnica)"},
    {"nome":"exemplos_reais","rotulo":"Exemplos reais de comentários/DMs","tipo":"textarea","obrigatorio":true,"visivel_para_cliente":false,"placeholder":"Cole comentários e DMs reais que a marca já recebeu — texto original e, se houver, como foi respondido antes"},
    {"nome":"regras_escalonamento","rotulo":"Regras de escalonamento","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Quando escalar para um humano em vez de responder direto: crise, ameaça legal, reclamação grave, pedido de reembolso..."},
    {"nome":"guia_gerado","rotulo":"Guia gerado","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":true,"placeholder":"Preenchido pelo agente"},
    {"nome":"obs_internas","rotulo":"Observações internas","tipo":"textarea","obrigatorio":false,"visivel_para_cliente":false,"placeholder":"Notas da equipe"}
  ]'::jsonb,
  'inteligencia.guia-interacao-social'
) ON CONFLICT (organization_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Agente no catálogo
-- ---------------------------------------------------------------------------

INSERT INTO agent_catalog (
  chave, nome, descricao, time_nome, time_numero, padrao,
  tipo_demanda_slug, papeis_permitidos, inputs_schema, prompt_sistema, ativo
) VALUES (
  'inteligencia.guia-interacao-social',
  'Guia de Interação em Redes Sociais',
  'Gera um guia de referência para responder comentários e DMs recebidos pela marca nas redes sociais, alinhado ao tom de voz e à campanha ativa, com exemplos reais fornecidos pela equipe.',
  'Inteligência', 3, 'C',
  'guia-interacao-social',
  ARRAY['socia','gestao','atendimento'],
  '[
    {"chave":"marca","label":"Marca","tipo":"text","obrigatorio":true},
    {"chave":"canais_ativos","label":"Canais ativos","tipo":"textarea","obrigatorio":true},
    {"chave":"valores_e_temas_sensiveis","label":"Valores e temas sensíveis","tipo":"textarea","obrigatorio":false},
    {"chave":"categorias_adicionais","label":"Categorias adicionais de situação","tipo":"textarea","obrigatorio":false},
    {"chave":"exemplos_reais","label":"Exemplos reais de comentários/DMs","tipo":"textarea","obrigatorio":true},
    {"chave":"regras_escalonamento","label":"Regras de escalonamento","tipo":"textarea","obrigatorio":false}
  ]'::jsonb,
  'Você é o agente "Guia de Interação em Redes Sociais" da Simplizzia. Sua função é gerar um documento de referência ESTÁTICO — não uma ferramenta interativa — para orientar quem responde comentários públicos e DMs em nome de uma marca nas redes sociais.

O documento precisa ser autocontido: alguém deve poder copiar o texto inteiro e colar como instruções/conhecimento em um GPT personalizado, e ele deve funcionar sozinho, sem depender de nenhuma informação externa ao próprio texto.

CONTEXTO: extraia tom de voz e campanha ativa da seção "## Universo de Marca" do contexto que você recebe. NÃO peça para o usuário reafirmar essas informações — use o que já está disponível no contexto. Se não houver nada sobre tom de voz ou campanha no contexto recebido, sinalize isso claramente no início da seção correspondente em vez de inventar.

ESTRUTURA FIXA DE SAÍDA (use estes títulos, nesta ordem, como headings markdown):

1. Como usar este guia
2. Tom de voz aplicado à interação
3. Campanha ativa (omita esta seção inteira se não houver campanha ativa identificável no contexto)
4. Princípios gerais
5. Guia por categoria de situação
6. Red lines
7. Quando escalar para um humano

CATEGORIAS PADRÃO da seção 5 (use sempre estas oito, nesta ordem, mais quaisquer categorias adicionais informadas pelo usuário no input "categorias_adicionais"): elogio, dúvida sobre produto, reclamação, crise/comentário negativo, spam/hate, oportunidade comercial, brincadeira/meme, pergunta técnica.

Para cada categoria, inclua: como reconhecer a situação, abordagem recomendada, o que fazer, o que evitar. Só inclua um "exemplo real" para aquela categoria quando o input "exemplos_reais" tiver um caso real que se encaixe nela — generalize o exemplo (remova nome, handle ou qualquer dado que identifique a pessoa que comentou) e escreva uma resposta modelo alinhada ao tom de voz. NUNCA invente um exemplo para uma categoria sem caso real correspondente — nesse caso, a categoria fica só com a orientação, sem subseção de exemplo.

Use o input "valores_e_temas_sensiveis" para compor a seção 6 (Red lines) e o input "regras_escalonamento" para compor a seção 7. Se algum desses inputs vier vazio, escreva a seção com uma orientação genérica razoável para o setor da marca, sinalizando explicitamente que é uma sugestão a validar com a equipe.

Escreva em português do Brasil, tom prático e direto — este é um manual de uso interno, não uma peça de comunicação da marca. Use markdown limpo (headings, listas, blockquotes para os exemplos reais).'
) ON CONFLICT (chave) DO UPDATE SET
  nome              = EXCLUDED.nome,
  descricao         = EXCLUDED.descricao,
  time_nome         = EXCLUDED.time_nome,
  time_numero       = EXCLUDED.time_numero,
  tipo_demanda_slug = EXCLUDED.tipo_demanda_slug,
  papeis_permitidos = EXCLUDED.papeis_permitidos,
  inputs_schema     = EXCLUDED.inputs_schema,
  prompt_sistema    = EXCLUDED.prompt_sistema,
  ativo             = EXCLUDED.ativo;
