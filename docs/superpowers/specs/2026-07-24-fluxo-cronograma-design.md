# Fluxo de Cronograma e Criação de Conteúdo — Design

**Data:** 2026-07-24
**Status:** Aprovado para implementação (decisões confirmadas com a sócia)
**Referência viva:** `clientes/ehrmann/cronograma-agosto-2026_2026-07-14/` — o cronograma
real de agosto da Ehrmann, com 9 rodadas de ajuste numeradas. É a melhor
descrição existente da forma que o processo precisa ter; esta spec o formaliza.

---

## Por que existe

O fluxo de cronograma foi ajustado numa conversa da semana de 14–16/07 que não
sobreviveu como transcript. Seu resultado sobreviveu como três migrations
(`20260716000001/2/3`), que citam textualmente "mistura de marcas em prompts de
IA" e "conteúdo de Trevo aparecendo em prompts de Ehrmann". O diagnóstico e a
correção estrutural (escopo por marca) foram salvos; faltou a parte de design —
agentes por etapa, chat de revisão, captura de aprendizados. Esta spec fecha
essa lacuna e serve de registro para que a decisão não se perca de novo.

Hoje o cronograma é um textão de IA colado num card (`cards_internos.dados.ia_output`)
e virar N posts de conteúdo é 100% manual — ou feito por scripts `.mjs`
avulsos, como os do Bantu Katu. Não há controle de SKU, de intercalação de
marca, de viabilidade por post, nem captura do que se aprendeu.

## O que o processo real exige (e o código não modela)

Extraído das 9 rodadas da Ehrmann:

1. **Distribuição de produto/SKU sem repetição.** "cada post usa um SKU
   diferente"; a rodada 9 removeu a última repetição que restava.
2. **Intercalação de sub-marcas** ao longo do mês (Apreciare ↔ High Protein),
   preservando dependências de ordem.
3. **Status de viabilidade por post:** Proposta / Roteiro a fechar /
   Só viável com IA / Depende de registro fotográfico — com uma tabela de
   "Ponto de transparência" listando as pendências.
4. **Horário de publicação por post** (o calendário do app hoje ignora
   `data_publicacao`).
5. **Legenda como parte do cronograma**, não etapa separada.
6. **Produtos fora de escopo por regra:** Splod e Bubbles fora, Apreciare Fit
   não lançado, Copo Coalhada com produção incerta, edições Copa excluídas.
7. **A regra da rodada 3:** *a lógica de sequenciamento rege a ORDEM dos posts,
   não o CONTEÚDO de cada um.* Ignorar isso gerou conceitos literários em vez
   de formatos concretos e custou várias rodadas de retrabalho.

## Decisões tomadas

- **Um agente por etapa** do processo (não um agente único, nem só gerador+revisor).
- **Tela de revisão** com **chat** para conduzir as rodadas de ajuste.
- **Aprendizados automáticos por marca**, com aprovação humana antes de virarem
  contexto.
- **Produtos/SKUs modelados** (tabela `produtos`, Fase 3), com controle de repetição.
- O desmembramento cria os cards após aprovação; a **geração de copy segue card
  a card**, por clique — não em lote.

---

## Modelo de dados

### `cronogramas`
Um cronograma é de uma marca, para um mês.

| coluna | tipo | nota |
|---|---|---|
| `id` | uuid | |
| `organization_id` | uuid | Regra #1 |
| `cliente_id` | uuid | |
| `marca_id` | uuid NOT NULL → onboarding_marcas | escopo por marca, sempre |
| `mes_referencia` | date | primeiro dia do mês |
| `status` | enum | `rascunho` → `em_revisao` → `aprovado` → `desmembrado` |
| `briefing` | jsonb | saída do agente de briefing (restrições, fontes, sequenciamento) |
| `temas_pilares` | jsonb | saída do agente de temas & pilares |
| `analise_coerencia` | jsonb | saída do agente de coerência |
| `card_origem_id` | uuid | card que disparou, quando houver |

### `cronograma_itens`
Um item = um post. É a linha da tabela do calendário editorial.

| coluna | tipo | nota |
|---|---|---|
| `cronograma_id` | uuid | |
| `data_publicacao` | date | |
| `horario` | time | |
| `pilar` | text | Ritmo / Momentos Reais / Sensorial / Institucional… |
| `marca_id` | uuid | sub-marca do post (pode diferir da marca-mãe do cronograma) |
| `produto_id` | uuid → produtos | para o controle de repetição de SKU |
| `formato` | text | reel / carrossel / estático / story / vídeo hero |
| `tema` | text | |
| `legenda` | text | |
| `viabilidade` | enum | `proposta` / `roteiro_a_fechar` / `so_ia` / `depende_registro` |
| `pendencia` | text | o que falta, quando `viabilidade` não é `proposta` |
| `detalhamento` | jsonb | o "Detalhamento por Post" (ângulo, referência visual, cuidados) |
| `ordem` | int | posição no arco de sequenciamento |
| `card_id` | uuid | preenchido no desmembramento |

### `cronograma_mensagens`
O chat da revisão. Cada rodada de ajuste fica registrada, com os itens afetados.

| coluna | tipo | nota |
|---|---|---|
| `cronograma_id` | uuid | |
| `papel` | text | `equipe` / `agente` |
| `autor_id` | uuid nullable | quem escreveu, quando é a equipe |
| `conteudo` | text | |
| `itens_afetados` | jsonb | ids de cronograma_itens que a rodada mexeu |
| `created_at` | timestamptz | |

Todas com `organization_id` + RLS `= auth_organization_id()`, escopo de equipe
(cliente não acessa o cronograma em construção).

---

## Agentes (um por etapa)

A cadeia substitui o atual `planejamento.calendario`. Cada etapa é
re-executável isoladamente — foi o que permitiu as 9 rodadas da Ehrmann sem
refazer tudo. Todos recebem o contexto da marca via `buildContextoCliente`
(marca + marca-mãe + docs de nível-cliente) mais os **produtos ativos** da marca.

1. **`cronograma.briefing`** — reúne marca, produtos ativos, restrições
   (produtos fora de escopo, datas comemorativas a excluir) e a lógica de
   sequenciamento do mês anterior. Saída: o `00-briefing`.
2. **`cronograma.temas-pilares`** — define os pilares editoriais do mês e quais
   produtos são elegíveis. Saída: o `01-temas-e-pilares`.
3. **`cronograma.calendario`** — distribui os posts. **Saída estruturada**
   (linhas de `cronograma_itens`), não markdown, para alimentar a tela de
   revisão. Aplica a regra da rodada 3 no próprio prompt: sequenciamento rege
   ordem, não conteúdo.
4. **`cronograma.coerencia`** — auditor. Checa SKU repetido, intercalação de
   marca, pendências de viabilidade, coerência de tom das legendas com o mês
   anterior. Saída: o `03-analise-coerencia`.
5. **`cronograma.angulos-alternativos`** — para posts marcados como frágeis,
   propõe alternativas. Saída: o `04-angulos-alternativos`.

Mais **`cronograma.aprendizados`**, que roda no fechamento (ver adiante).

Cada agente entra em `catalog.ts` (fonte que a UI lê) e é seedado no
`agent_catalog`. Ver a nota sobre fonte única de agentes na Fase 3.

---

## Tela de revisão

Rota nova, ex. `board/cronograma/[id]` ou `clientes/[id]/marcas/[marcaId]/cronograma/[id]`.

- **Tabela editável** com as colunas do calendário real: data, horário, pilar,
  sub-marca, produto, formato, tema, legenda, viabilidade. Edição campo a campo.
- **Painel de chat ao lado**, reaproveitando a infra da Izzi (`api/izzi/chat`,
  `izzi_conversas`/`izzi_mensagens`, `IzziChatWidget`). Instruções em linguagem
  natural — "tira o post do dia 11", "o 24 vira textura de High Protein",
  "intercala as marcas" — reescrevem as linhas afetadas; o histórico fica salvo
  em `cronograma_mensagens`. É exatamente como as 9 rodadas aconteceram, agora
  dentro do app.
- **Alertas ao vivo:** SKU repetido no mês, marca fora da rotação de intercalação,
  post sem produto quando o formato exige.
- **"Criar os cards"** só habilita com `status = aprovado`.

## Desmembramento

Ao aprovar, um card por `cronograma_item`:
- `cliente_id`, `marca_id`, `produto_id`, `data_publicacao`, `prazo_interno`.
- `tipo_id` derivado do formato: reel → `reel`, carrossel → `post-carrossel`,
  estático → `post-feed`, story → `story`.
- `campos_publicos` com tema, pilar e legenda proposta.
- status inicial `a_fazer`.
- **Idempotente:** reprocessar não duplica (usa `cronograma_itens.card_id` como
  guarda). `cronograma.status` vai a `desmembrado`.

A geração de copy de cada card segue por clique no drawer, como já é hoje —
evita gerar 20 peças ruins de uma vez.

## Aprendizados

No fechamento, `cronograma.aprendizados` compara o gerado com o aprovado e
propõe aprendizados ("legendas diretas, produto nomeado, tagline explícita —
nada de quiet luxury editorial", que foi a lição da rodada 9). Após **aprovação
humana**, viram documento na aba Aprendizados da marca (`universo_marca`), que
já é injetada como contexto por `buildContextoCliente` nos meses seguintes.

## Calendário

`calendario/actions.ts` hoje filtra por `prazo_cliente` e ignora
`data_publicacao` e marca. Passa a mostrar os posts pela data de publicação,
com a marca visível — para que o cronograma desmembrado apareça como calendário
de verdade.

---

## Ordem de implementação

1. Migrations: enums + `cronogramas`, `cronograma_itens`, `cronograma_mensagens`.
2. Os 6 agentes (`catalog.ts` + seed), com o de calendário devolvendo estrutura.
3. Tela de revisão (tabela + chat + alertas).
4. Desmembramento idempotente.
5. Aprendizados no fechamento.
6. Ajuste do calendário.

## Verificação

Gerar um cronograma de um mês para a Ehrmann e comparar com
`02-calendario-editorial-agosto.md`: mesmas dimensões preenchidas, zero SKU
repetido, marcas intercaladas. Rodar 2–3 rodadas de ajuste pelo chat. Aprovar,
desmembrar, conferir os cards no board com data, marca e produto corretos.
Rodar o desmembramento duas vezes e confirmar que não duplica.
