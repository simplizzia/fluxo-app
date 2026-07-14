# Guia de Interação em Redes Sociais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um novo agente ao catálogo (`inteligencia.guia-interacao-social`) que gera um guia estático de orientação para responder comentários e DMs em nome de uma marca, alinhado a tom de voz e campanha ativa, com exemplos reais fornecidos pela equipe.

**Architecture:** Segue o padrão existente do catálogo de 62 agentes: uma linha em `tipos_demanda` (formulário) + uma linha em `agent_catalog` (prompt-sistema, executado por `src/lib/agents/executor.ts`) + uma entrada espelhada em `src/lib/agents/catalog.ts` (fonte de verdade do frontend, usada pela página `/agentes`). Nenhuma tabela nova, nenhuma rota nova — é 100% dados + um prompt.

**Tech Stack:** Supabase (Postgres + migrations SQL), TypeScript (`src/lib/agents/catalog.ts`), Next.js Server Actions já existentes (nenhuma mudança de código de aplicação).

---

## Contexto para quem for executar

Spec completa: [docs/superpowers/specs/2026-07-14-guia-interacao-social-design.md](../specs/2026-07-14-guia-interacao-social-design.md).

Pontos que quem implementa precisa saber, sem precisar ler o resto do código:

- **`agent_catalog` (tabela)** é o que `executor.ts` lê para pegar o `prompt_sistema` na hora de rodar o agente (por `chave`). As colunas `papeis_permitidos` e `inputs_schema` dessa tabela **não são lidas por nenhum código da aplicação** — são só documentação/espelho. Não perca tempo tentando fazê-las "funcionar"; só preencha por consistência com as outras 62 linhas.
- **`src/lib/agents/catalog.ts` (arquivo TS)** é o que a página `/agentes` de fato usa para montar a lista de agentes, os grupos por time e os campos do formulário do modal (`TriggerModal.tsx`). Se você esquecer de atualizar esse arquivo, o agente existe no banco mas **não aparece em lugar nenhum da UI**.
- **`tipos_demanda` (tabela)** só importa para o fluxo de cards no Kanban (Padrão A). Este agente é Padrão C (manual, via `/agentes`), então a entrada em `tipos_demanda` é só para manter o padrão e permitir, no futuro, que alguém crie um card desse tipo — não é estritamente necessária para o agente funcionar na página `/agentes`, mas todos os outros agentes estratégicos (Conceito de Campanha, Personas, etc.) têm essa entrada, então mantemos a simetria.
- **O modal de disparo manual (`/agentes` → `TriggerModal.tsx`) só tem seletor de cliente, não de marca.** Isso significa que o contexto automático que `buildContextoCliente` (em `executor.ts`) monta virá em nível de **cliente inteiro** (todos os documentos do Universo de Marca daquele cliente, de todas as marcas), não filtrado pela marca específica. Essa é uma limitação pré-existente que afeta todos os agentes marca-específicos do catálogo hoje — **não é algo que este plano deveria corrigir** (decisão já tomada durante o brainstorming). Se o cliente tiver só uma marca, não faz diferença nenhuma na prática.
- **Não existe salvamento automático do output no Universo de Marca.** Rodar o agente em `/agentes` gera o texto, mostra na tela com um botão "Copiar" — e para virar de fato um documento em `universo_marca` (visível ao cliente), alguém da equipe precisa colar esse texto manualmente na tela de "Universo de Marca" do cliente/marca (fluxo já existente, usado por todos os outros agentes manuais — não estamos construindo isso agora).
- **Este projeto não tem suite de testes automatizados** (`package.json` só tem `lint` e `type-check`, sem `test`). A verificação aqui é: `type-check` + `lint` passando, uma query SQL confirmando que as linhas foram inseridas corretamente, e um teste manual disparando o agente pela UI.

---

## Task 1: Migration — novo tipo de demanda + agente no catálogo

**Files:**
- Create: `supabase/migrations/20260714000001_guia_interacao_social.sql`

- [ ] **Step 1: Criar o arquivo de migration com o conteúdo abaixo**

```sql
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

Escreva em português do Brasil, tom prático e direto — este é um manual de uso interno, não uma peça de comunicação da marca. Use markdown limpo (headings, listas, blockquotes para os exemplos reais).',
  true
)
ON CONFLICT (chave) DO UPDATE SET
  nome              = EXCLUDED.nome,
  descricao         = EXCLUDED.descricao,
  time_nome         = EXCLUDED.time_nome,
  time_numero       = EXCLUDED.time_numero,
  tipo_demanda_slug = EXCLUDED.tipo_demanda_slug,
  papeis_permitidos = EXCLUDED.papeis_permitidos,
  inputs_schema     = EXCLUDED.inputs_schema,
  prompt_sistema    = EXCLUDED.prompt_sistema,
  ativo             = EXCLUDED.ativo;
```

- [ ] **Step 2: Ler o arquivo de volta e conferir visualmente que o SQL não tem aspas simples desbalanceadas dentro do `prompt_sistema`**

O `prompt_sistema` é uma string literal SQL entre aspas simples. Confirme que não há nenhuma aspas simples solta no meio do texto (ex: contrações como "d'água" — não deveria haver nenhuma neste texto, mas vale conferir antes de aplicar).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260714000001_guia_interacao_social.sql
git commit -m "feat(agentes): adiciona tipo de demanda e agente Guia de Interação em Redes Sociais"
```

---

## Task 2: Espelhar o agente em `src/lib/agents/catalog.ts`

**Files:**
- Modify: `src/lib/agents/catalog.ts:162` (logo após o bloco `inteligencia.validador-tom`, ainda dentro da seção "Time 3: Inteligência")

- [ ] **Step 1: Adicionar a entrada ao array `AGENTES`, imediatamente após o objeto `inteligencia.validador-tom` (linha 162) e antes do comentário `// ── Time 4: Planejamento`**

```typescript
  {
    chave: 'inteligencia.guia-interacao-social',
    nome: 'Guia de Interação em Redes Sociais',
    descricao: 'Gera um guia de referência para responder comentários e DMs recebidos pela marca, alinhado ao tom de voz e à campanha ativa, com exemplos reais fornecidos pela equipe.',
    time: 'Inteligência',
    timeNumero: 3,
    padrao: 'C',
    tipoDemandaSlug: 'guia-interacao-social',
    papeisPermitidos: ['socia', 'gestao', 'atendimento'],
    inputsSchema: [
      { chave: 'marca', label: 'Marca', tipo: 'text', obrigatorio: true },
      { chave: 'canais_ativos', label: 'Canais ativos', tipo: 'textarea', obrigatorio: true },
      { chave: 'valores_e_temas_sensiveis', label: 'Valores e temas sensíveis', tipo: 'textarea', obrigatorio: false },
      { chave: 'categorias_adicionais', label: 'Categorias adicionais de situação', tipo: 'textarea', obrigatorio: false },
      { chave: 'exemplos_reais', label: 'Exemplos reais de comentários/DMs', tipo: 'textarea', obrigatorio: true },
      { chave: 'regras_escalonamento', label: 'Regras de escalonamento', tipo: 'textarea', obrigatorio: false },
    ],
  },
```

- [ ] **Step 2: Rodar type-check**

Run: `npm run type-check`
Expected: sem erros (saída vazia / exit code 0).

- [ ] **Step 3: Rodar lint**

Run: `npm run lint`
Expected: sem erros no arquivo `src/lib/agents/catalog.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/catalog.ts
git commit -m "feat(agentes): espelha Guia de Interação em Redes Sociais no catálogo do frontend"
```

---

## Task 3: Aplicar a migration e verificar no banco

**Files:** nenhum arquivo novo — esta task só aplica e confere a migration da Task 1.

⚠️ Esta task altera o banco de produção (Supabase). Confirme com o usuário antes de rodar `db push` se estiver executando isso de forma autônoma — é uma alteração em infraestrutura compartilhada, não um passo puramente local.

- [ ] **Step 1: Aplicar as migrations pendentes**

Run: `npx supabase db push`
Expected: a saída lista `20260714000001_guia_interacao_social.sql` como aplicada, sem erros. Se o CLI reclamar de histórico de migration dessincronizado (já aconteceu antes neste projeto), aplique o conteúdo do arquivo diretamente pelo SQL Editor do Supabase Studio como alternativa — o efeito final é o mesmo.

- [ ] **Step 2: Confirmar que o tipo de demanda foi criado**

Rode esta query no SQL Editor do Supabase (ou via `psql`):

```sql
select nome, slug, categoria, agente_slug
from tipos_demanda
where slug = 'guia-interacao-social';
```

Expected: 1 linha, `categoria = 'estrategia'`, `agente_slug = 'inteligencia.guia-interacao-social'`.

- [ ] **Step 3: Confirmar que o agente foi criado no catálogo**

```sql
select chave, nome, time_nome, time_numero, padrao, ativo
from agent_catalog
where chave = 'inteligencia.guia-interacao-social';
```

Expected: 1 linha, `time_nome = 'Inteligência'`, `time_numero = 3`, `padrao = 'C'`, `ativo = true`.

---

## Task 4: Teste manual — rodar o agente de ponta a ponta

**Files:** nenhum — verificação funcional via UI, sem mudança de código.

- [ ] **Step 1: Subir o servidor de desenvolvimento**

Run: `npm run dev`

- [ ] **Step 2: Abrir `/agentes` logado como `socia`, `gestao` ou `atendimento`**

Confirme que "Guia de Interação em Redes Sociais" aparece agrupado sob o time **Inteligência**, com badge "Manual" (padrão C).

- [ ] **Step 3: Abrir o modal do agente e conferir os campos do formulário**

Devem aparecer, na ordem: Marca (obrigatório), Canais ativos (obrigatório), Valores e temas sensíveis, Categorias adicionais de situação, Exemplos reais de comentários/DMs (obrigatório), Regras de escalonamento. Confirme que os campos batem com o `inputsSchema` da Task 2.

- [ ] **Step 4: Rodar com dados reais de teste (marca Trevo), selecionando o cliente Trevo no seletor**

Use estes valores (mesmos usados na simulação em chat durante o brainstorming):

- **Marca:** `Trevo`
- **Canais ativos:** `Instagram (principal canal de interação com consumidor final)`
- **Valores e temas sensíveis:** `Não prometer benefício de saúde não validado pela equipe Trevo. Não usar gancho de "embalagem volta pra casa" (é descartável). CTA não deve pedir pra marcar a criança — usar comentário. Criança nunca como protagonista/rosto em cena. Decisão de compra é da mãe/avó — falar com elas, não com a criança. Sem menção a Copa do Mundo ou Black Friday.`
- **Categorias adicionais de situação:** `Onde comprar / disponibilidade em ponto de venda específico — recorrente nos comentários reais.`
- **Exemplos reais de comentários/DMs:**
  ```
  1. "Amo iogurte e ainda mais da Hello Kitty 😍😍😍"
  2. "Eu levaria de lanche pro trabalho todos os dias 😍"
  3. "ma minha cidade não achei 😢"
  4. "Delicinha. Eu já experimentei esses iogurtes nos eventos, mas não achei para comprar aqui em São Paulo. Sera que já começou a vender na rede Hirota? 😍"
  5. "Deve ser uma delícia os produtos de vcs 😍"
  ```
- **Regras de escalonamento:** (deixe em branco propositalmente — testa o comportamento do prompt quando o input está vazio)

- [ ] **Step 5: Conferir o output gerado contra os critérios da spec**

Confirme, na saída:
- As 7 seções aparecem, na ordem definida no prompt.
- A seção "Campanha ativa" só aparece se o cliente Trevo tiver algum documento de campanha no Universo de Marca — caso contrário, deve estar ausente (não deve aparecer vazia nem inventada).
- Cada uma das 8 categorias padrão aparece na seção 5, mais a categoria adicional "onde comprar".
- Exemplos reais aparecem **apenas** nas categorias em que os 5 comentários se encaixam (elogio e dúvida sobre disponibilidade) — nenhuma categoria sem caso real (ex: spam/hate, crise) deve ter um exemplo inventado.
- A seção "Quando escalar para um humano" existe e é sinalizada como sugestão a validar (já que o campo ficou vazio no teste).

Se algo destoar do esperado, ajuste o `prompt_sistema` na migration (Task 1) e reaplique via `UPDATE agent_catalog SET prompt_sistema = '...' WHERE chave = 'inteligencia.guia-interacao-social';` antes de seguir.

- [ ] **Step 6: Registrar feedback do teste (opcional, mas recomendado)**

Use os botões de feedback (👍/👎) na própria UI do agente após a execução — isso alimenta `agent_feedback`, que futuras execuções deste agente já vão usar como calibração (via `buildFeedbackContext` em `executor.ts`).

---

## Self-Review

**Cobertura da spec:**
- Novo agente Time 3/Inteligência, padrão C ✅ Task 1–2
- Tipo de demanda `guia-interacao-social`, categoria `estrategia` ✅ Task 1
- 8 campos de formulário, `exemplos_reais` obrigatório e interno ✅ Task 1
- Contexto automático de tom de voz/campanha (nenhum código novo — já existe em `executor.ts`) ✅ documentado no prompt (Task 1) e verificado no teste manual (Task 4)
- Estrutura de 7 seções, exemplos reais só quando fornecidos ✅ codificado no `prompt_sistema` (Task 1), verificado na Task 4
- Armazenamento em `universo_marca` categoria `parametros` / subcategoria `guia_interacao_social` — **não automatizado neste plano**: é o mesmo fluxo manual de "colar no Universo de Marca" que todo agente Padrão C já usa hoje; não há tarefa de código porque não há código a mudar.

**Fora de escopo (confirmado durante o brainstorming, não incluído neste plano):**
- Seletor de marca no `TriggerModal.tsx` / `actionTriggerAgente`.
- Regeneração automática/agendada.
- Cobertura de reviews/avaliações de marketplace.
