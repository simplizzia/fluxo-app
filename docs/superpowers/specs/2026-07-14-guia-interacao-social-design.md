# Guia de Interação em Redes Sociais — Design

**Data:** 2026-07-14
**Status:** Aprovado para implementação

## Contexto

O Fluxo App tem um catálogo de 62 agentes de IA organizados em times (`src/lib/agents/catalog.ts`), cada um mapeado a um `tipo_demanda` que roda a partir de um card e gera um documento salvo no Universo da Marca (`universo_marca`) do cliente.

Hoje existem agentes para criar conteúdo (posts, reels, stories), definir tom de voz (`inteligencia.parametrizador`) e validar se um texto já escrito está alinhado ao tom (`inteligencia.validador-tom`), e um agente de estratégia de comentários no LinkedIn (`linkedin.comentarios`) — mas esse último cobre comentar em posts de terceiros para ganhar alcance, não como responder às interações que a própria marca recebe.

Não existe nenhum agente que gere uma **orientação de como responder** a comentários e DMs recebidos pela marca, alinhada ao tom de voz e à campanha ativa do momento. Este documento desenha esse novo agente.

## Objetivo

Criar um agente que gera um **guia estático de referência** — não uma ferramenta interativa — para orientar quem responde comentários públicos e DMs em nome da marca. O guia deve:

- Traduzir o tom de voz já definido da marca para o contexto específico de resposta a interações.
- Incorporar a campanha ativa do momento, quando houver.
- Cobrir categorias de situação (elogio, dúvida, reclamação, crise, spam, oportunidade comercial, brincadeira, pergunta técnica) mais quaisquer situações específicas do cliente.
- Incluir exemplos reais de comentários/DMs que a marca já recebeu, generalizados (sem dados pessoais identificáveis), com resposta modelo.
- Definir regras de escalonamento (quando um humano deve assumir em vez de responder direto).
- Ser autocontido o suficiente para que a equipe do cliente possa colar o conteúdo como instruções/conhecimento em um GPT personalizado próprio, se quiser.

## Escopo

- **Tipos de interação cobertos:** comentários públicos + DMs (não inclui reviews/avaliações de marketplace nesta primeira versão).
- **Canais:** multi-canal genérico — um guia único aplicável a qualquer rede onde a marca esteja presente, sem seções separadas por plataforma.
- **Fora de escopo:** gerar respostas em tempo real para comentários/DMs individuais (isso seria um agente diferente, um "assistente de resposta", não coberto aqui).

## Onde vive no sistema

- **Novo agente:** `inteligencia.guia-interacao-social` — Time 3 (Inteligência), ao lado de `inteligencia.parametrizador` e `inteligencia.validador-tom`. Esse time já é responsável pela aplicação prática do tom de voz da marca; este agente é uma extensão natural — tom de voz aplicado a respostas de interação.
- **Padrão de execução:** C (manual, sob demanda). A equipe aciona o agente quando quiser gerar ou regenerar o guia — por exemplo, quando o tom de voz muda ou uma nova campanha entra no ar. Não há regeneração automática/agendada nesta primeira versão.
- **Novo tipo de demanda:** slug `guia-interacao-social`, categoria `estrategia` (mesma categoria de Diagnóstico de Marca, Personas, Parametrização e Conceito de Campanha — documentos estratégicos gerados sob demanda).
- **Papéis permitidos para rodar o agente:** `socia`, `gestao`, `atendimento`.

## Contexto automático

O executor de agentes (`src/lib/agents/executor.ts`, função `buildContextoCliente`) já injeta automaticamente, para cards vinculados a uma marca (`marcaId`), todas as seções do Universo de Marca daquela marca como contexto antes de chamar a Claude — incluindo tom de voz, campanha ativa, personas, diagnóstico, etc.

Por isso, o formulário deste agente **não** pede para colar tom de voz ou campanha ativa manualmente — eles chegam automaticamente pelo contexto, desde que:

1. O card seja criado vinculado à marca correta (`marca_id` setado).
2. Os documentos de Parametrização (tom de voz) e, se aplicável, Conceito de Campanha já existam no Universo de Marca daquela marca.

O prompt-sistema do agente instrui explicitamente a Claude a extrair tom de voz e campanha ativa da seção "Universo de Marca" do contexto recebido, em vez de depender de reafirmação no input do usuário.

## Formulário (`campos_formulario`)

| Campo | Tipo | Obrigatório | Visível ao cliente | Descrição |
|---|---|---|---|---|
| `marca` | text | sim | sim | Nome da marca |
| `canais_ativos` | textarea | sim | sim | Em quais redes a marca está presente e recebe interação (Instagram, LinkedIn, TikTok, WhatsApp Business, etc.) |
| `valores_e_temas_sensiveis` | textarea | não | sim | O que a marca nunca deve dizer, temas proibidos, concorrentes a não citar, posicionamentos delicados |
| `categorias_adicionais` | textarea | não | sim | Situações específicas desse cliente além da lista padrão (ex: "reclamação de entrega" para e-commerce, "dúvida sobre agenda" para clínica) |
| `exemplos_reais` | textarea | **sim** | **não (interno)** | Comentários e DMs reais que a marca já recebeu, colados pela equipe — texto original e, se houver, como foi respondido antes |
| `regras_escalonamento` | textarea | não | sim | Quando a equipe deve escalar para um humano em vez de responder direto (crise, ameaça legal, reclamação grave, pedido de reembolso) |
| `guia_gerado` | textarea | não | sim | Preenchido pelo agente — o documento final |
| `obs_internas` | textarea | não | não | Notas da equipe |

`exemplos_reais` é interno porque pode conter nomes/handles de pessoas reais que comentaram. O documento final (`guia_gerado`) generaliza esses casos em exemplos sem dados pessoais identificáveis antes de ficar visível ao cliente.

A lista padrão de categorias de situação (elogio, dúvida, reclamação, crise/comentário negativo, spam/hate, oportunidade comercial, brincadeira/meme, pergunta técnica) é fixa no prompt-sistema do agente, não no formulário — `categorias_adicionais` só soma casos extras específicos do cliente.

## Estrutura do documento gerado

O `guia_gerado` segue esta estrutura fixa:

1. **Como usar este guia** — nota curta explicando que é referência para quem responde pela marca, e que pode ser colado como instruções/conhecimento em um GPT personalizado (autocontido, sem depender de nada externo ao próprio documento).
2. **Tom de voz aplicado à interação** — resumo prático (2-3 parágrafos) do tom de voz já definido, traduzido especificamente para respostas: como a marca soa quando responde alguém, não quando publica um post.
3. **Campanha ativa** (se houver no contexto) — mensagens-chave da campanha do momento, e quando/como reforçá-las numa resposta sem soar forçado. Omitida se não houver campanha ativa no contexto recebido.
4. **Princípios gerais** — regras que valem para qualquer resposta: velocidade esperada, sempre responder vs. quando ignorar, nunca apagar críticas legítimas, etc.
5. **Guia por categoria de situação** — para cada categoria (as 8 padrão + as adicionais informadas em `categorias_adicionais`):
   - Como reconhecer a situação
   - Abordagem recomendada
   - Fazer / Evitar
   - Exemplo real (a partir de `exemplos_reais`, generalizado — sem nome/handle da pessoa) + resposta modelo, **apenas quando a equipe forneceu um caso real daquela categoria** — categorias sem exemplo real não recebem exemplo inventado.
6. **Red lines** — temas e frases que nunca devem ser usados, baseado em `valores_e_temas_sensiveis`.
7. **Quando escalar para um humano** — baseado em `regras_escalonamento`, com lista objetiva de gatilhos.

## Armazenamento e visibilidade

- Output salvo primeiro em `cards_internos.dados.ia_output` (padrão de todo agente C), depois promovido para `universo_marca` escopado por `marca_id`.
- **Categoria:** `parametros` (extensão conceitual do tom de voz/parametrização).
- **Subcategoria:** `guia_interacao_social` (permite localizar e substituir ao regenerar).
- **Visibilidade:** campos do formulário marcados `visivel_para_cliente: true` (todos exceto `exemplos_reais` e `obs_internas`) tornam o guia acessível também ao papel `cliente` — coerente com o caso de uso do GPT personalizado da equipe do cliente.

## Fora de escopo (por agora)

- Geração/sugestão de resposta em tempo real para um comentário ou DM específico recebido.
- Regeneração automática/agendada (padrão B) quando tom de voz ou campanha mudam.
- Cobertura de reviews/avaliações de marketplace.
- Seções separadas por canal (Instagram vs. LinkedIn vs. outros) — o guia é multi-canal genérico.
