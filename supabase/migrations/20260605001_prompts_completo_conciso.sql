-- ============================================================================
-- Pipeline — documentos completos e concisos numa geração só (evita corte/drift)
-- 2026-06-05
-- ============================================================================
-- Acrescenta a todos os agentes da sequência uma diretiva de formato/tamanho:
-- cobrir TODA a estrutura de forma equilibrada, nunca deixar seções de fora,
-- nunca inventar seções, e parar ao terminar a última seção.

UPDATE agent_catalog
SET prompt_sistema = prompt_sistema || E'\n\n---\nFORMATO E TAMANHO (regra obrigatória):\n- Produza o documento COMPLETO: todas as seções da estrutura obrigatória, do início ao fim.\n- Seja objetivo e equilibrado. NUNCA gaste espaço demais nas primeiras seções a ponto de deixar as últimas faltando. É melhor um documento inteiro e conciso do que um detalhado pela metade.\n- NUNCA invente seções fora da estrutura definida para você.\n- Ao concluir a última seção da estrutura, PARE. Não continue com conteúdo de outras etapas (ex.: diagnóstico, parâmetros) que não fazem parte do seu papel.'
WHERE chave IN (
  'personas.personas',
  'diagnostico.digital',
  'brand-system.principal',
  'diagnostico-marca.diagnostico',
  'inteligencia.parametrizador'
);
