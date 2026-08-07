# Kanban — Tipos de Demanda e Fluxos — Mapeamento (Fase 1)

**Data:** 2026-08-06
**Status:** ✅ Mapeamento validado nos pontos principais — pronto para a Fase 2 (restam
confirmações finas: lista de famílias de risco p/ dupla aprovação)
**Plano:** `~/.claude/plans/users-rafaelaaraujo-downloads-5zijqyvu-floofy-star.md`
**Base de dados:** quadros Trello `Simplizzia` (interno) e `[TREVO] Demandas 360º`,
janela Jun–Ago 2026 (exports `kJgYTkz3` e `5ZijqyvU`).

---

## Por que existe

O Kanban precisa organizar **todas** as demandas (interno + clientes) como uma mistura de
Trello + Workflow do mLabs adaptado. Hoje a operação roda em dois quadros Trello que se
contradizem — um com **coluna = pessoa** (esconde o fluxo), outro com **coluna = status**
(esconde o quem) — e o fluxo está confuso: os parceiros não sabem mover os cards corretamente.

Decisão de produto: **coluna = etapa do fluxo; pessoa = lente**. Antes de construir, este
documento mapeia **quais tipos de demanda existem** e **qual fluxo cada um segue**, para que os
fluxos sejam definidos como *dados* (tabelas `fluxos`/`fluxo_etapas`), não hard-coded.

Este é o artefato a validar. Cada tabela abaixo traz uma **proposta** derivada dos dados; as
lacunas a preencher com as sócias estão em [Perguntas abertas](#perguntas-abertas).

---

## 1. Os três eixos que hoje moram no título

Nos dados, os títulos são `[MARCA] [CANAL] [CAMPANHA] Título` — o título faz o trabalho de três
campos que precisam virar estruturados:

| Eixo | Existe hoje? | Exemplos nos dados | Ação |
|---|---|---|---|
| **Marca** | Sim (`marca_id`/`cliente_id`) | TREVO, EHRMANN, MUSIC HOUSE, BANTUKATU | — |
| **Canal / Tipo** | Parcial (`tipo_id` + `categoria_demanda`) | LINKEDIN, INSTITUCIONAL, COMERCIAL, EMBALAGEM, ENCARTE, PDV, BLOG | Cobrir os canais reais |
| **Campanha / Tema** | **Não** | COPA DO MUNDO, PÁSCOA, KIDS, REFEIÇÃO ESPECIAL | Novo campo `campanha` (tag) |

---

## 2. Famílias de fluxo (catálogo-semente)

Sete famílias. Cada tipo de demanda aponta para uma família (= um `fluxo`).

| Família | Tipos/canais | Marca externa? | Publicação datada? | Esforço típico |
|---|---|---|---|---|
| **A. Conteúdo social** | Instagram, LinkedIn, Post, Sorteio, **Roteiro de vídeo** (nasce aqui) | Sim | Sim | médio |
| **B. Arte avulsa / peça** | Institucional, Comercial, Digital, Banner, Encarte, PDV/MPDV, Arte, Trade | Sim | Não | baixo–médio |
| **C. Embalagem / Rótulo** | Embalagem, Rótulo, Novo produto, Mockup | Sim | Não | alto |
| **D. Evento** | Evento, Corrida, Feira (Trevo 360) | Sim | Data do evento | médio |
| **E. Interno / RH** | Comunicação interna, Comunicado, Vaga | Não | Não | baixo |
| **F. Relatório / Estratégia** | Relatório, Estratégia SPZ, Planejamento | Sim | Cadência mensal | médio |
| **G. Comercial / Jurídico** | Contrato, Proposta | Sim | Não | baixo |
| **H. Tráfego pago** | Campanhas de mídia paga | Sim | Veiculação | médio |
| **I. Vídeo (Videomaker)** | Produção/edição de vídeo (roteiro vem da Família A) | Sim | Sim (via cronograma) | alto |
| **J. Blog SEO/GEO** | Textos de blog otimizados p/ SEO/GEO | Sim | Data de publicação | médio |

**Prazo interno — sugerido pela IA (decidido):** **não** é buffer fixo. O `prazo_interno` é
**sugerido pela IA** a partir da **carga atual** (demandas em andamento por pessoa) e do
**esforço estimado** de cada demanda (a coluna "Esforço típico" é só ponto de partida). O
responsável pode ajustar. O **envio ao cliente** continua na data que ele pediu.

**Insight que orienta o desenho das etapas:** no Trevo, a etapa de aprovação **volta quase
tanto quanto passa** (≈28 rejeições × 22 aprovações: `Em aprovação → A fazer/Em andamento`). Por
isso todas as famílias com cliente externo colocam os **validadores de IA logo antes da
aprovação interna** — é onde o retrabalho é cortado.

### 2.1 Princípio: a IA participa da CRIAÇÃO, não só da revisão

Mudança de filosofia (decidida): os agentes **não entram só como revisão/otimização no fim**.
Eles **facilitam a criação desde a entrada**. Toda família começa com um
**Pré-desenvolvimento IA**: quando o briefing chega do cliente, a IA **organiza as informações
e pré-desenvolve a demanda** com base no **histórico de demandas parecidas** (mesma marca/
tipo). A pessoa parte de um rascunho, não de uma folha em branco.

- Gancho pronto: `executarAgente` já monta `buildContextoCliente` (marca/universo) e
  `buildFeedbackContext` (últimos feedbacks). Estender para **buscar demandas parecidas** e
  gerar um primeiro rascunho no card (`cards_internos.dados.ia_output`).
- Aplica-se à **etapa 1 de todas as famílias** (marcada "Briefing + pré-desenvolvimento IA").
- O **responsável pode inserir um direcionamento prévio** (contexto/ênfase) **antes de rodar o
  agente**, para guiar o rascunho — não é um botão cego.

---

## 3. Fluxos por família

Legenda de `tipo` de etapa: **`exec`** (auto-avança ao completar o sinal) · **`agente`**
(roda IA; passa→avança, reprova→ajustes) · **`portão`** (só por ação humana) · **`fim`**.
`Cliente vê?` = etapa aparece no card do lado do cliente.

### A. Conteúdo social  *(DUAS aprovações do cliente, em dois níveis)*

Confirmado: o cliente aprova **conceito** e depois **arte**. Isso se resolve em dois níveis —
o conceito no **cronograma** (mensal, em lote), a arte no **card** (por post) — encaixando no
`cronograma → desmembrarCronograma → cards` que o app já tem.

**Nível 1 — Cronograma (mensal, uma vez para o mês):** hoje é a "planilha" de Instagram/LinkedIn.

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Planejamento IA (temas, ideia de imagem, legenda) | agente | agentes do cronograma | Dono (Rafaela); copy: Rafaela/Adrielle | não |
| 2 | **Revisão IA (tom de voz + marca + pilar + coerência)** | agente | agentes OK | — | não |
| 3 | Revisão interna | portão | equipe ok | Rafaela + Adrielle | não |
| 4 | **Aprovação de CONCEITO (cliente)** — NOVO | portão | cliente aprova | Cliente | **sim** |
| 5 | Desmembramento em cards | exec | `desmembrarCronograma` | — | — |

*(A revisão de tom/marca/pilar acontece **aqui**, antes de o cronograma ir ao cliente — não
depois do designer. No Nível 2, depois da arte, sobra só a revisão **visual**.)*

> A planilha tem muita info interna (mais útil pra equipe que pro cliente) → no Nível 1 o cliente
> vê só tema / ideia de imagem / legenda; viabilidade, SKU, notas ficam internos (`visivel_cliente`
> **por campo**, não só por etapa). Falta hoje: uma camada de **aprovação do cronograma pelo
> cliente** (o cronograma é equipe-only). Planilha-modelo compartilhada pela sócia.

**Nível 2 — Card (por post, nasce já com conceito aprovado):**

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Design (arte) | exec | arquivo de entrega | Caio | "em produção" |
| 2 | Revisão IA (**apenas visual**: revisão de arte + marca visual) | agente | agentes OK | — | não |
| 3 | Aprovação interna (única) | portão | 1 assinatura | Rafaela ou Adrielle | não |
| 4 | Aguardando envio (na data do cliente) | exec | `pg_cron` na data | — | não |
| 5 | **Aprovação da ARTE (cliente)** | portão | cliente aprova | Cliente | **sim** |
| 6 | Ajustes (se reprovado) | exec | volta p/ arte (Caio) ou conceito (Rafaela/Adrielle) | Caio ou sócia | sim |
| 7 | Publicado / Concluído | fim | Thamara sobe o post | Thamara | sim |

*(A copy/legenda é da Rafaela ou Adrielle; a arte é do Caio. Roteiro de vídeo nasce no Nível 1 e
sua produção segue a Família I — Vídeo.)*

### B. Arte avulsa / peça

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Briefing / Info | portão | info completa | Dono (Rafaela/Adrielle) | não |
| 2 | Design | exec | arquivo de entrega | Caio | "em produção" |
| 3 | Revisão IA (publicação + marca visual) | agente | agentes OK | — | não |
| 4 | Aprovação interna (única) | portão | 1 assinatura | Rafaela ou Adrielle | não |
| 5 | Aguardando envio | exec | `pg_cron` na data | — | não |
| 6 | Aprovação do cliente | portão | cliente aprova | Cliente | **sim** |
| 7 | Concluído | fim | — | — | sim |

### C. Embalagem / Rótulo / Mockup  *(pedido nasce do cliente; DUAS aprovações; Caio = visual, Thamara = técnica)*

Fluxo real: **Cliente solicita → Adrielle direciona → Caio faz o design (visual) → Thamara
checa → cliente aprova o design → Thamara faz a adaptação técnica do arquivo → envio final.**
A Thamara só adapta o arquivo **depois** do cliente aprovar o design (por isso as duas aprovações).

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Solicitação do cliente + pré-desenvolvimento IA | agente | pedido recebido; IA organiza specs/histórico | Cliente → Adrielle | não |
| 2 | Direcionamento | portão | briefing técnico pronto | Adrielle | não |
| 3 | Design visual do rótulo | exec | arquivo de design | Caio | "em produção" |
| 4 | Checagem técnica | portão | ok técnico | Thamara | não |
| 5 | Aprovação interna **dupla** (risco) | portão | 2 assinaturas | Rafaela + Adrielle | não |
| 6 | **Aprovação do DESIGN (cliente)** | portão | cliente aprova | Cliente | **sim** |
| 7 | Adaptação técnica do arquivo | exec | arquivo adaptado | Thamara | não |
| 8 | **Envio final ao cliente** | fim | entrega | Amanda / Thamara | **sim** |

### D. Evento  *(Simplizzia faz só a parte VISUAL; o resto é do cliente; pode ter 2 aprovações)*

A Simplizzia atende **apenas o material visual** do evento (peças, material impresso/digital,
arte de camisa etc.). Logística — reserva, credenciamento, envio de produtos — é **do cliente**.

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Briefing do evento + pré-desenvolvimento IA | agente | info do cliente; IA organiza | Adrielle | não |
| 2 | Produção dos materiais visuais | exec | **checklist de peças 100%** | Caio | "em produção" |
| 3 | Revisão IA (marca visual) | agente | agente OK | — | não |
| 4 | Aprovação interna | portão | assinatura(s) | Rafaela + Adrielle | não |
| 5 | Aprovação do cliente *(pode haver 2ª rodada)* | portão | cliente aprova | Amanda ↔ Cliente | **sim** |
| 6 | Concluído / entregue p/ o evento | fim | entrega | — | sim |

### E. Interno / RH  *(sem cliente externo; curto)*

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Briefing / Info | portão | info completa | Adrielle (comms) | — |
| 2 | Redação / Arte | exec | arquivo de entrega | Caio / Adrielle | — |
| 3 | Conformidade de tom (IA) | agente | agente OK | — | — |
| 4 | Aprovação interna | portão | assinatura | Adrielle | — |
| 5 | Publicado / Concluído | fim | — | — | — |

### F. Relatório / Estratégia  *(responsável: Rafaela; cadência mensal; IA gera o grosso)*

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Coleta de dados | exec | dados prontos | cron | não |
| 2 | Geração (IA: relatório mensal / performance) | agente | agente OK | — | não |
| 3 | Revisão interna | portão | dono revisa | **Rafaela** | não |
| 4 | Aprovação interna | portão | assinatura | Rafaela + Adrielle | não |
| 5 | Entregue ao cliente | fim | envio | Amanda | **sim** |

### G. Comercial / Jurídico  *(sem publicação; curto)*

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Briefing comercial | portão | dados completos | Sócia | não |
| 2 | Geração (IA: gerador de contrato/proposta) | agente | agente OK | — | não |
| 3 | Conformidade LGPD (IA, quando aplica) | agente | agente OK | — | não |
| 4 | Aprovação interna **dupla** (risco) | portão | 2 assinaturas | Rafaela + Adrielle | não |
| 5 | Enviado ao cliente / assinatura | fim | envio | Amanda | **sim** |

### H. Tráfego pago  *(responsável = Rafaela, que faz o intermédio com o cliente; gestora é interna)*

A gestora de tráfego tem contato **só interno** com a Simplizzia; entra com o cliente **apenas
em exceções**. O intermédio com o cliente é sempre da **Rafaela**.

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Briefing + verba/objetivo + pré-desenvolvimento IA | agente | info + verba; IA organiza | Rafaela (dona) | não |
| 2 | Estratégia/plano de mídia | portão | plano ok | Gestora (interno) → Rafaela alinha c/ cliente | **sim** |
| 3 | Configuração de campanha | exec | campanha montada | Gestora | não |
| 4 | Veiculação (no ar) | exec | campanha ativa | Gestora | sim |
| 5 | Monitoramento + otimização (IA) | agente | `monitor-investimento` / `otimizador` | Gestora | não |
| 6 | Relatório (IA) | agente | `relatorio-trafego` | Rafaela entrega | **sim** |

> **Criativos para tráfego:** quando a campanha precisa de peças, isso **não incha o fluxo de
> tráfego** — vira uma demanda da **Família B (Arte avulsa)** atribuída ao Caio, **vinculada**
> ao card de tráfego (dependência). Mantém cada fluxo limpo. *(Recomendação — confirmar.)*

### I. Vídeo  *(DOIS tipos de roteiro; roteiro nasce na Família A / cronograma)*

**I-1. Videomaker INTERNA (Simplizzia produz):**

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Roteiro (vem do cronograma) | portão | roteiro aprovado no Nível 1 (A) | Rafaela/Adrielle | (já aprovado) |
| 2 | Captação / gravação | exec | material bruto | Videomaker interna | "em produção" |
| 3 | Edição | exec | arquivo de entrega | Videomaker (+ Caio p/ arte) | não |
| 4 | Revisão IA (tom + marca) | agente | agentes OK | — | não |
| 5 | Aprovação interna (única) | portão | 1 assinatura | Rafaela ou Adrielle | não |
| 6 | Aguardando envio | exec | `pg_cron` na data | — | não |
| 7 | Aprovação do cliente | portão | cliente aprova | Cliente | **sim** |
| 8 | Publicado / Concluído | fim | Thamara sobe | Thamara | sim |

**I-2. TERCEIRIZADO contratado pelo cliente (ex.: Trevo — Simplizzia só entrega o roteiro):**

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Roteiro (vem do cronograma) | portão | roteiro aprovado no Nível 1 (A) | Rafaela/Adrielle | **sim** |
| 2 | Envio do roteiro ao terceirizado | exec | roteiro entregue | Amanda | sim |
| 3 | Produção externa (fora da Simplizzia) | exec | vídeo recebido do terceirizado | Terceirizado (cliente) | sim |
| 4 | Revisão interna (marca/tom) | portão | equipe ok | Rafaela/Adrielle | não |
| 5 | Aprovação do cliente | portão | cliente aprova | Cliente | sim |
| 6 | Publicado / Concluído | fim | — | — | sim |

### J. Blog SEO/GEO

| # | Etapa | Tipo | Avança por | Papel | Cliente vê? |
|---|---|---|---|---|---|
| 1 | Pauta + palavra-chave | portão | pauta definida | Dono (Rafaela) | não |
| 2 | Redação | exec | texto pronto | Rafaela/Adrielle (redator) | "em produção" |
| 3 | Otimização SEO/GEO (IA) | agente | `conteudo.seo-geo` (a criar) | — | não |
| 4 | Revisão IA (tom de voz) | agente | agente OK | — | não |
| 5 | Aprovação interna (única) | portão | 1 assinatura | Rafaela ou Adrielle | não |
| 6 | Aguardando envio | exec | `pg_cron` na data | — | não |
| 7 | Aprovação do cliente | portão | cliente aprova | Cliente | **sim** |
| 8 | Publicado / Concluído | fim | publicação no blog | — | sim |

---

## 4. O card — campos (público × interno)

**Público (o cliente vê):** título · marca · canal · campanha · etapa atual (das que têm
`Cliente vê? = sim`) · **data que o cliente pediu** · data de publicação (famílias A/D) ·
arquivos de entrega/versão · comentários marcados `visivel_para_cliente`.

**Interno (`cards_internos`, nunca vaza — o cliente NUNCA vê estes campos):** papéis do card
(**dono / executor / apoio / atendimento**) · **prazo interno** (sugerido pela IA: carga +
esforço; ajustável) · checklist/subtarefas · **outputs dos agentes** · direcionamento prévio
dado ao agente · assinaturas da aprovação interna · custo/horas · notas · prioridade
operacional · flag "aguardando envio".

**Abertura pelo cliente:** o cliente abre a demanda informando a **data que precisa**
(obrigatória); o sistema deriva o `prazo_interno`. Espelha o "Modelos de Card para Abertura de
Demandas" do Trevo.

---

## 5. Papéis e atribuição

| Pessoa | Papel | Responsabilidade |
|---|---|---|
| **Rafaela** | Sócia | Dona de **tudo do digital** (LinkedIn executado pela Adrielle, resp. dela); + **Relatórios** e **Tráfego pago** (faz o intermédio com o cliente) |
| **Adrielle** | Sócia | Dona do **restante** (não-digital) + **coordenação/comunicação com a equipe**; executa LinkedIn |
| **Amanda** | Atendimento | Interface com o cliente |
| **Gestor de Projetos** | Gestão (papel novo) | "Abaixo das sócias" (nome provisório). Se existir, **vê tudo** — como sócias e atendimento |
| **Caio** | Designer | Execução visual |
| **Thamara** | Apoio | Sobe posts p/ aprovação, reposta, **parte técnica de embalagem** (checagem + adaptação do arquivo) |
| **Gestora de tráfego** | Tráfego | Mídia paga — contato **só interno** com a Simplizzia; com o cliente só em exceções (intermédio é da Rafaela) |
| **Videomaker** | Vídeo | Captação/edição de vídeo — **novo quadro a criar** |

> **Visibilidade (decidido):** veem **TUDO** apenas **sócias (Rafaela, Adrielle), atendimento
> (Amanda) e o Gestor de Projetos** (papel novo). **Todos os demais** — Caio, Thamara, gestora
> de tráfego, videomaker, executores — veem **só os cards atribuídos a eles** (escopo `executor`,
> RLS por `responsavel_id`). Cliente vê só os próprios.

**Atribuição automática por família** (tira o peso de decidir "quem move"): digital→Rafaela ·
não-digital→Adrielle · design→Caio · subir posts/repost + técnica de embalagem→Thamara ·
interface com cliente→Amanda. Ajustável no card.

**Aprovação interna (decidido):** por padrão, **aprovação única** (Rafaela ou Adrielle). A
**dupla aprovação** (Rafaela E Adrielle) fica **só nas famílias de risco** — proposto:
**C (Embalagem)** e **G (Comercial/Jurídico)**; o **H (Tráfego)** já tem o portão de verba com a
Rafaela. As demais seguem com aprovação única. (Lista de risco a confirmar.)

---

## 6. Intervenções de IA por etapa (agentes que já existem)

Gancho pronto: `executarAgente({ cardId })` grava em `cards_internos.dados.ia_output`.

| Intervenção | Agente (`chave`) | Famílias |
|---|---|---|
| **Pré-desenvolvimento** (organiza briefing + histórico → rascunho) | `briefing.izzi` + `executarAgente` estendido p/ demandas parecidas | **todas (etapa 1)** |
| Revisão de publicação | `criativo.publicacao` | A, B |
| Conformidade de tom de voz | `inteligencia.validador-tom` | A, E, LinkedIn |
| Checagem de marca (visual) | `brand-system.validador-visual` | A, B, C |
| Aderência ao pilar/estratégia | `inteligencia.validador-pilar` | A, LinkedIn |
| Coerência do calendário | `cronograma.coerencia` | A (já roda no cronograma) |
| Geração de relatório | `monitoramento.relatorio-mensal` / `.performance` | F |
| Geração de contrato/proposta | `comercial.gerador-contrato` / `.gerador-proposta` | G |
| Conformidade LGPD | `conformidade.consultor-lgpd` | G |
| Monitoramento + otimização de mídia | `trafego.monitor-investimento` / `.otimizador` | H |
| Relatório de tráfego | `trafego.relatorio-trafego` | H |
| Revisão de vídeo (tom/marca) | `inteligencia.validador-tom` / `brand-system.validador-visual` | I |
| Blog: otimização SEO/GEO | **`conteudo.seo-geo`** (a criar) | J |
| Blog: tom de voz | `inteligencia.validador-tom` | J |

Fonte de verdade = tabela **`agent_catalog`** (o `catalog.ts` está dessincronizado com o
`architecture.md`). **Reprovação de um agente → o card vai para `necessita_ajustes`** (decidido).

---

## Perguntas abertas

Todas resolvidas nesta rodada — restam apenas confirmações finas:

1. ~~Famílias e etapas~~ ✅ **10 famílias (A–J) fechadas** por ora.
2. ~~Buffers~~ ✅ **Não é buffer fixo:** o `prazo_interno` é **sugerido pela IA** (carga atual +
   esforço estimado), ajustável pelo responsável. Ver §2.
3. ~~Dupla aprovação~~ ✅ **Aprovação única por padrão; dupla só em famílias de risco** (proposto
   C, G). *(Confirmar a lista de risco.)*
4. ~~Reprovação de agente~~ ✅ **Vai para `necessita_ajustes`.**
5. ~~Papel novo "abaixo das sócias"~~ ✅ **Gestor de Projetos** (nome provisório) — vê tudo.
6. ~~Visibilidade dos executores~~ ✅ **Só os cards deles.** Vê tudo = sócias + atendimento +
   Gestor de Projetos.
7. ~~Papéis por card~~ ✅ **dono / executor / apoio / atendimento** (Amanda entra como
   atendimento). **Nunca visíveis ao cliente** (ficam em `cards_internos`).
8. ~~Família A com duas aprovações~~ ✅ conceito (cronograma) + arte (card). Falta implementar a
   **aprovação do cronograma pelo cliente** (hoje equipe-only). *(Mudança estrutural da Família A.)*
9. ~~Quem é o redator?~~ ✅ **Copy é da Rafaela ou Adrielle.**
10. ~~Tráfego e Vídeo — visibilidade~~ ✅ **Só o que é delas** (escopo `executor`).
11. ~~Blog SEO/GEO — agente?~~ ✅ **Criar `conteudo.seo-geo`.**
12. ~~Criativos de tráfego~~ ✅ **Viram demanda da Família B vinculada** ao card de tráfego (não
    incham o fluxo). Ver nota na Família H.
13. ~~IA na criação~~ ✅ **Incluir busca de demandas parecidas** no pré-desenvolvimento; o
    responsável pode **dar um direcionamento prévio antes de rodar o agente**. Ver §2.1.
