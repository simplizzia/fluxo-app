# Perfil de Criador Ideal — Design

**Data:** 2026-07-14
**Status:** Aguardando revisão

## Contexto

O Fluxo App tem um catálogo de 62 agentes de IA organizados em times (`src/lib/agents/catalog.ts`), cada um mapeado a um `tipo_demanda` que roda a partir de um card e gera um documento salvo nos campos internos do card (`cards_internos.dados.ia_output`, exibido no `CardDetailDrawer`).

Já existe a demanda **"Cronograma de Influenciadores"** (slug `cronograma-influenciadores`, categoria `redes_sociais`, migration `20260610000001_sprint_estrategia_campanhas.sql`), com campos como nicho, porte do influenciador, objetivo da parceria e orçamento mensal — mas **sem `agente_slug`**. Hoje o campo `lista_influenciadores` é preenchido manualmente pela equipe, sem nenhuma orientação de IA sobre qual tipo de criador buscar.

Não existe nenhum agente que traduza tom de voz + campanha ativa + orçamento em uma **orientação de perfil de criador ideal**, com exemplos reais. Este documento desenha esse agente e a infraestrutura de apoio necessária (biblioteca de criadores).

## Objetivo

Dar à demanda "Cronograma de Influenciadores" um agente que gera:

1. Arquétipos do criador de conteúdo ideal para a marca/campanha (personalidade, estilo de conteúdo, estética, tipo de audiência).
2. Exemplos reais de criadores que casam com esses arquétipos.
3. Critérios de avaliação e red flags para quando a equipe avaliar candidatos reais depois.

## Restrição crítica: anti-alucinação

Claude não tem acesso à web por padrão nesta plataforma — nenhum dos 62 agentes existentes usa tools. Gerar "exemplos reais" de criadores sem fonte de dados é um risco real de alucinação: nomes, handles e métricas de pessoas reais inventados de forma plausível, que a equipe poderia repassar ao cliente por engano.

Solução: **biblioteca interna curada** como fonte primária (sem risco de invenção — o agente só cita quem está na lista que o backend injeta) + **busca na web como recurso opcional e explicitamente sob demanda**, com resultados marcados como não verificados.

## Onde vive no sistema

- **Novo agente:** `criativo.perfil-criador` — Time 5 (Criativo), ao lado de `criativo.pauta-ugc` (que já lida com briefing de UGC/criadores, mas não com a seleção do perfil).
- **Padrão de execução:** A (disparado pelo card), ligado à demanda existente `cronograma-influenciadores` — não cria uma demanda nova.
- **Papéis permitidos para rodar o agente:** `socia`, `gestao`, `atendimento` (mesmos papéis de `criativo.pauta-ugc`).
- **Busca web opcional:** botão separado no card, restrito a `socia` e `gestao` (é a primeira capacidade de navegação real da plataforma — mais cara e lenta que os demais agentes; atendimento usa o agente principal normalmente).

## Contexto automático

Igual aos demais agentes ligados a marca: `buildContextoCliente` (`src/lib/agents/executor.ts`) injeta automaticamente tom de voz, campanha ativa e demais seções do Universo de Marca, desde que o card esteja vinculado à marca (`marca_id`) e esses documentos já existam no Universo de Marca daquela marca.

Como isso não é garantido para todo cliente (pode ainda não ter Parametrização de Conteúdo ou Conceito de Campanha documentados), o formulário inclui um campo de fallback opcional (`diretrizes_tom_campanha`) para a equipe colar manualmente quando faltar.

## Biblioteca interna de criadores

Nova tabela `criadores_referencia`, escopada por `organization_id` (regra do projeto — `organization_id = auth_organization_id()` em toda policy), **sem `cliente_id`**: compartilhada entre todos os clientes da Simplizzia, cresce como ativo da agência ao longo do tempo.

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | PK |
| `organization_id` | uuid | FK organizacoes, NOT NULL |
| `nome` | text | Nome/nome artístico do criador |
| `handle` | text | @perfil |
| `link` | text | URL do perfil principal |
| `nicho` | text | Ex: gastronomia, saúde, lifestyle, família |
| `porte` | enum/select | Nano (1k-10k) / Micro (10k-100k) / Macro (100k+) — mesmas faixas do campo `tipo_influenciador` já existente |
| `canais` | text[] | Em quais redes esse criador atua (pode ser mais de uma) — não confundir com o campo `canal` do formulário abaixo, que é o canal-alvo da campanha |
| `tom_estilo` | textarea | Como esse criador se comunica, pra casar com tom de marca |
| `faixa_preco` | text | Livre — "permuta", "R$500-1500/post" |
| `clientes_evitar` | text | Notas de conflito (ex: já trabalhou com concorrente X) |
| `notas` | textarea | Observações internas |
| `criado_por` | uuid | FK profiles |
| `criado_em` / `atualizado_em` | timestamptz | Auditoria |

**RLS:** leitura/escrita para papéis `socia`, `gestao`, `atendimento`; sem acesso para `cliente` e `executor`.

**Tela de cadastro:** rota nova `/criadores` (fora da Área das Sócias, já que atendimento também cadastra) — lista com busca/filtro por nicho e porte, formulário simples de criar/editar.

## Como o agente usa a biblioteca

Antes de chamar a Claude API, o backend (extensão de `executor.ts` ou lógica equivalente específica deste agente) consulta `criadores_referencia` filtrando por nicho/porte/canal compatíveis com o input do card, e injeta essa lista pré-filtrada no contexto da chamada. O agente **nunca** vê a biblioteca inteira — só os candidatos relevantes já filtrados.

O prompt-sistema proíbe explicitamente inventar nomes, handles ou dados de criadores reais: só pode citar quem estiver na lista injetada. Se a lista vier vazia, o documento deve dizer isso claramente ("nenhum criador na biblioteca casa com este nicho ainda") e sugerir a busca na web — nunca preencher a lacuna com um nome plausível.

### Prompt-sistema (rascunho)

```
Você é o agente "Perfil de Criador Ideal" da Simplizzia, uma agência de
marketing. Sua função é traduzir o tom de voz, a campanha ativa e o
orçamento de uma marca em uma orientação prática de qual tipo de criador
de conteúdo (influenciador) buscar para uma parceria.

Você recebe:
- Contexto da marca (tom de voz, posicionamento, pilares de conteúdo,
  campanha ativa se houver) — seção "Universo de Marca" do contexto.
- Input do briefing: nicho, porte desejado, objetivo da parceria,
  orçamento mensal, canal.
- Uma lista de criadores da biblioteca interna da Simplizzia, já
  pré-filtrada por nicho/porte/canal compatíveis — pode vir vazia.

Gere um documento com 4 seções:

1. Leitura do briefing — resumo em 2-3 frases do que a marca precisa
   (tom, campanha, orçamento, objetivo).
2. Arquétipos de criador ideal — 2 a 3 perfis-tipo (não pessoas reais)
   descrevendo personalidade, estilo de conteúdo, estética e tipo de
   audiência que casam com a marca.
3. Exemplos reais — cite APENAS criadores que estejam na lista da
   biblioteca fornecida no contexto. Para cada um, cite explicitamente
   a faixa de preço/condição (permuta, fee, range) ao lado da recomendação,
   não só o fato de ser compatível. Nunca invente nome, handle, número
   de seguidores ou qualquer dado de uma pessoa real. Se a lista vier
   vazia ou não tiver ninguém compatível, diga isso explicitamente e
   recomende buscar na web ou prospecção manual — não preencha a lacuna
   com um nome plausível.
4. Critérios de avaliação — checklist objetivo (fit de tom, faixa de
   porte, alinhamento de valores) e red flags a evitar (histórico de
   conteúdo problemático, incompatibilidade de valores, engajamento
   comprado etc.) para quando a equipe avaliar candidatos reais depois.

Escreva em português, tom consultivo e direto, sem enrolação. Não
presuma dados que não foram fornecidos.
```

### Validação (testes manuais pré-implementação)

Rodei o prompt acima manualmente (simulando a chamada, sem código) contra dois cenários, usando contexto real de clientes existentes e uma biblioteca de 4 criadores fictícios (claramente marcados como inventados, só para o teste):

- **Teste 1 — Bantu-Katu, match parcial:** biblioteca com 1 fit forte, 1 fit parcial (região adjacente) e 1 fora do porte/tom. O agente distinguiu os três corretamente, sem inventar um quinto nome, e usou proibições de vocabulário específicas do Brand System (não só "não combina" genérico) para descartar o candidato desalinhado.
- **Teste 2 — Trevo, zero match no nicho:** biblioteca sem nenhum criador do nicho pedido (maternidade/família). O agente declarou explicitamente a ausência de exemplos, sem forçar nenhum dos 4 fictícios pra dentro do nicho errado, e recomendou busca na web/prospecção manual. Também aplicou uma regra editorial específica da marca (não centralizar rosto de criança em cena) que não estava no input — só no Universo de Marca.

Os dois testes confirmam que a regra anti-alucinação se sustenta tanto com match parcial quanto com zero match. Ajuste incorporado ao prompt acima: exigir a faixa de preço explícita ao lado de cada exemplo (no primeiro teste o agente mencionou "compatível" sem repetir o valor).

## Busca na web (opcional)

Botão "Buscar mais exemplos na web" no card, disponível após a primeira geração, com destaque quando a biblioteca não cobriu o nicho:

- Aciona uma segunda chamada à Claude API, só para esse botão, com a tool de busca na web da Anthropic habilitada.
- Resultados entram numa seção separada do documento, marcados como **"pesquisa automática — confirmar antes de usar"** (seguidores mudam, perfis saem do ar, dados podem estar desatualizados).
- Restrito a `socia` e `gestao` por custo/latência.
- Fora de escopo desta v1: promoção automática dos resultados da busca web para a biblioteca — isso fica manual, via tela de cadastro, quando a equipe validar o achado.

## Formulário (`campos_formulario` de `cronograma-influenciadores`)

| Campo | Status | Tipo | Obrigatório | Visível ao cliente |
|---|---|---|---|---|
| `marca` | existente | text | sim | sim |
| `nicho` | existente | text | sim | sim |
| `tipo_influenciador` (porte) | existente | select | sim | sim |
| `canal` | **novo** | select (Instagram/TikTok/YouTube/Multi-canal) | sim | sim |
| `objetivo` | existente | textarea | sim | sim |
| `orcamento_mensal` | existente | text | não | não |
| `diretrizes_tom_campanha` | **novo** | textarea | não | não |
| `lista_influenciadores` | existente (ressignificado) | textarea | não | não |
| `briefing_padrao` | existente | textarea | não | sim |
| `obs_internas` | existente | textarea | não | não |

`diretrizes_tom_campanha`: fallback para quando o Universo de Marca ainda não tiver tom de voz/campanha documentados.

`lista_influenciadores`: passa a ser preenchida **depois** da orientação da IA, para registrar a escolha final da equipe — não mais o único lugar de mapeamento.

## Output do agente

Documento único em markdown (mesmo padrão dos demais agentes, exibido em `ia_output`):

1. Leitura rápida do briefing (tom, campanha, orçamento, objetivo, canal)
2. 2-3 arquétipos de criador ideal
3. Exemplos reais da biblioteca que casam com cada arquétipo (ou aviso de lacuna)
4. Critérios de avaliação e red flags para validar candidatos reais depois

## Fluxo de uso

1. Card "Cronograma de Influenciadores" criado no board, vinculado à marca do cliente.
2. Equipe preenche nicho, porte, canal, objetivo, orçamento (+ diretrizes de tom/campanha se necessário).
3. Agente roda: injeta contexto de marca + criadores da biblioteca compatíveis → gera arquétipos + exemplos + critérios.
4. Se a biblioteca não cobrir bem o nicho, equipe aciona (opcional) a busca na web.
5. Equipe registra a escolha final em `lista_influenciadores` e segue com `briefing_padrao`.
6. Novos criadores descobertos (via web ou prospecção manual) são cadastrados em `/criadores`, crescendo a biblioteca para próximas campanhas.

## Fora de escopo (v1)

- Promoção automática de resultados de busca web para a biblioteca.
- Outreach/abordagem automatizada aos criadores (mensagem de contato).
- Acompanhamento de performance de campanhas de influenciadores já rodadas (fica para uma futura extensão do time Monitoramento).
- Biblioteca isolada por cliente (decisão: compartilhada entre clientes, com campo `clientes_evitar` para mitigar conflito).

## Migrations necessárias

1. Nova tabela `criadores_referencia` + RLS.
2. `ALTER` em `tipos_demanda` (linha `cronograma-influenciadores`): adicionar `agente_slug = 'criativo.perfil-criador'` e atualizar `campos_formulario` com os dois campos novos.
3. Seed do agente `criativo.perfil-criador` na tabela `agent_catalog` (espelhando a entrada em `catalog.ts`).
