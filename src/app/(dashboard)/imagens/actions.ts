'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  requireEquipeImagens,
  requireImagensAdmin,
  requireAcessoCliente,
} from '@/lib/imagens/acesso'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Seletor de clientes
// ---------------------------------------------------------------------------

export interface ClienteImagens {
  id: string
  nome: string
  temBlocoMestre: boolean
}

export async function buscarClientesImagens(): Promise<{
  clientes?: ClienteImagens[]
  isAdmin?: boolean
  error?: string
}> {
  const { profile, isAdmin } = await requireEquipeImagens()
  const supabase = await createClient()

  let clienteIds: string[] | null = null
  if (!isAdmin) {
    const { data: acessos } = await supabase
      .from('imagens_acesso')
      .select('cliente_id')
      .eq('profile_id', profile.id)
    clienteIds = (acessos ?? []).map((a) => a.cliente_id)
    if (clienteIds.length === 0) return { clientes: [], isAdmin }
  }

  let query = supabase
    .from('clientes')
    .select('id, nome')
    .neq('status', 'inativo')
    .order('nome')
  if (clienteIds) query = query.in('id', clienteIds)

  const { data: clientes, error } = await query
  if (error) return { error: 'Erro ao buscar clientes.' }

  const ids = (clientes ?? []).map((c) => c.id)
  const { data: blocos } = ids.length
    ? await supabase.from('imagens_bloco_mestre').select('cliente_id').in('cliente_id', ids)
    : { data: [] }
  const comBloco = new Set((blocos ?? []).map((b) => b.cliente_id))

  return {
    isAdmin,
    clientes: (clientes ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      temBlocoMestre: comBloco.has(c.id),
    })),
  }
}

// ---------------------------------------------------------------------------
// Bloco Mestre
// ---------------------------------------------------------------------------

const blocoMestreSchema = z.object({
  clienteId: z.string().uuid(),
  paleta_hex: z.array(z.string().trim()).max(20),
  regra_paleta: z.string().trim().max(2000),
  estilo_luz: z.string().trim().max(2000),
  sentimento_marca: z.string().trim().max(4000),
  negativos_padrao: z.array(z.string().trim()).max(100),
  formato_padrao: z.string().trim().max(100),
  estilo_geral: z.string().trim().max(2000),
})

export async function actionSalvarBlocoMestre(
  input: z.infer<typeof blocoMestreSchema>,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = blocoMestreSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  const d = parsed.data
  const { error } = await supabase.from('imagens_bloco_mestre').upsert(
    {
      organization_id: profile.organization_id,
      cliente_id: d.clienteId,
      paleta_hex: d.paleta_hex.filter(Boolean),
      regra_paleta: d.regra_paleta || null,
      estilo_luz: d.estilo_luz || null,
      sentimento_marca: d.sentimento_marca || null,
      negativos_padrao: d.negativos_padrao.filter(Boolean),
      formato_padrao: d.formato_padrao || '4:5 vertical',
      estilo_geral: d.estilo_geral || null,
    },
    { onConflict: 'cliente_id' },
  )

  if (error) return { error: 'Erro ao salvar Bloco Mestre.' }
  revalidatePath(`/imagens/${d.clienteId}`, 'layout')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Fichas de Produto
// ---------------------------------------------------------------------------

const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  clienteId: z.string().uuid(),
  nome: z.string().trim().min(1).max(200),
  formato: z.string().trim().max(1000),
  escala_relativa: z.string().trim().max(1000),
  tampa: z.string().trim().max(500),
  regra_geracao: z.string().trim().max(2000),
  restricao_conteudo: z.string().trim().max(2000),
  alerta_contraste: z.string().trim().max(2000),
  angulos_disponiveis: z.array(
    z.enum(['frontal', '3-4', 'perfil', 'de-cima', 'sem-tampa']),
  ),
})

export async function actionSalvarProduto(
  input: z.infer<typeof produtoSchema>,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = produtoSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  const d = parsed.data
  const campos = {
    nome: d.nome,
    formato: d.formato || null,
    escala_relativa: d.escala_relativa || null,
    tampa: d.tampa || null,
    regra_geracao: d.regra_geracao || null,
    restricao_conteudo: d.restricao_conteudo || null,
    alerta_contraste: d.alerta_contraste || null,
    angulos_disponiveis: d.angulos_disponiveis,
  }

  const { error } = d.id
    ? await supabase.from('imagens_produtos').update(campos).eq('id', d.id)
    : await supabase.from('imagens_produtos').insert({
        ...campos,
        organization_id: profile.organization_id,
        cliente_id: d.clienteId,
      })

  if (error) return { error: 'Erro ao salvar produto.' }
  revalidatePath(`/imagens/${d.clienteId}/produtos`)
  return { ok: true }
}

export async function actionExcluirProduto(
  produtoId: string,
  clienteId: string,
): Promise<{ ok?: boolean; error?: string }> {
  await requireImagensAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('imagens_produtos').delete().eq('id', produtoId)
  if (error) return { error: 'Erro ao excluir produto.' }
  revalidatePath(`/imagens/${clienteId}/produtos`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Banco de Variações
// ---------------------------------------------------------------------------

export async function actionCriarCategoria(
  clienteId: string,
  tipo: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!tipo.trim()) return { error: 'Informe o tipo da categoria.' }
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('imagens_categorias_variacao').insert({
    organization_id: profile.organization_id,
    cliente_id: clienteId,
    tipo: tipo.trim(),
  })
  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma categoria com esse tipo.' }
    return { error: 'Erro ao criar categoria.' }
  }
  revalidatePath(`/imagens/${clienteId}/variacoes`)
  return { ok: true }
}

export async function actionCriarAtributo(
  clienteId: string,
  categoriaId: string,
  valor: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!valor.trim()) return { error: 'Informe o valor do atributo.' }
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('imagens_variacao_atributos').insert({
    organization_id: profile.organization_id,
    cliente_id: clienteId,
    categoria_id: categoriaId,
    valor: valor.trim(),
  })
  if (error) return { error: 'Erro ao criar atributo.' }
  revalidatePath(`/imagens/${clienteId}/variacoes`)
  return { ok: true }
}

export async function actionAtualizarStatusAtributo(
  clienteId: string,
  atributoId: string,
  status: 'aprovado' | 'testando' | 'reprovado',
): Promise<{ ok?: boolean; error?: string }> {
  await requireImagensAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('imagens_variacao_atributos')
    .update({ status })
    .eq('id', atributoId)
  if (error) return { error: 'Erro ao atualizar atributo.' }
  revalidatePath(`/imagens/${clienteId}/variacoes`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Personagens
// ---------------------------------------------------------------------------

const personagemSchema = z.object({
  id: z.string().uuid().optional(),
  clienteId: z.string().uuid(),
  nome: z.string().trim().min(1).max(200),
  descricao_fixa: z.string().trim().max(4000),
  alerta_contaminacao: z.string().trim().max(2000),
})

export async function actionSalvarPersonagem(
  input: z.infer<typeof personagemSchema>,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = personagemSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  const d = parsed.data
  const campos = {
    nome: d.nome,
    descricao_fixa: d.descricao_fixa || null,
    alerta_contaminacao: d.alerta_contaminacao || null,
  }
  const { error } = d.id
    ? await supabase.from('imagens_personagens').update(campos).eq('id', d.id)
    : await supabase.from('imagens_personagens').insert({
        ...campos,
        organization_id: profile.organization_id,
        cliente_id: d.clienteId,
      })

  if (error) return { error: 'Erro ao salvar personagem.' }
  revalidatePath(`/imagens/${d.clienteId}/personagens`)
  return { ok: true }
}

export async function actionExcluirPersonagem(
  personagemId: string,
  clienteId: string,
): Promise<{ ok?: boolean; error?: string }> {
  await requireImagensAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('imagens_personagens').delete().eq('id', personagemId)
  if (error) return { error: 'Erro ao excluir personagem.' }
  revalidatePath(`/imagens/${clienteId}/personagens`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------

const cenaSchema = z.object({
  clienteId: z.string().uuid(),
  personagem_texto: z.string().trim().max(1000),
  personagem_id: z.string().uuid().nullable(),
  acao_pose: z.string().trim().min(1).max(4000),
  produto_id: z.string().uuid().nullable(),
  variacao_atributo_id: z.string().uuid().nullable(),
  formato: z.string().trim().max(100),
  nota_especial: z.string().trim().max(2000),
  prompt_final: z.string().trim().min(1),
  negativos_final: z.string().trim(),
  ferramenta_recomendada: z.string().trim().max(200),
})

export async function actionSalvarCena(
  input: z.infer<typeof cenaSchema>,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = cenaSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const d = parsed.data
  const { profile } = await requireAcessoCliente(d.clienteId)
  const supabase = await createClient()

  const { error } = await supabase.from('imagens_cenas').insert({
    organization_id: profile.organization_id,
    cliente_id: d.clienteId,
    personagem_texto: d.personagem_texto || null,
    personagem_id: d.personagem_id,
    acao_pose: d.acao_pose,
    produto_id: d.produto_id,
    variacao_atributo_id: d.variacao_atributo_id,
    formato: d.formato || null,
    nota_especial: d.nota_especial || null,
    prompt_final: d.prompt_final,
    negativos_final: d.negativos_final || null,
    ferramenta_recomendada: d.ferramenta_recomendada || null,
    criado_por: profile.id,
  })

  if (error) return { error: 'Erro ao salvar cena.' }
  revalidatePath(`/imagens/${d.clienteId}/historico`)
  return { ok: true }
}

export async function actionAprovarCena(
  cenaId: string,
  clienteId: string,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAcessoCliente(clienteId)
  const supabase = await createClient()
  const { error } = await supabase
    .from('imagens_cenas')
    .update({ status: 'testado_aprovado' })
    .eq('id', cenaId)
  if (error) return { error: 'Erro ao aprovar cena.' }
  revalidatePath(`/imagens/${clienteId}/historico`)
  return { ok: true }
}

const reprovacaoSchema = z.object({
  cenaId: z.string().uuid(),
  clienteId: z.string().uuid(),
  dimensao_regua: z.string().trim().min(1).max(200),
  descricao_erro: z.string().trim().min(1).max(4000),
  correcao_aplicada: z.string().trim().max(4000),
  // decisão consciente obrigatória — sem default
  escopo_do_erro: z.enum(['tecnico_universal', 'especifico_do_cliente']),
  /** vincular a um caso existente (mesmo padrão) em vez de criar novo */
  caso_existente_id: z.string().uuid().nullable(),
})

export async function actionReprovarCena(
  input: z.infer<typeof reprovacaoSchema>,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = reprovacaoSchema.safeParse(input)
  if (!parsed.success) return { error: 'Preencha dimensão, descrição e escopo do erro.' }
  const d = parsed.data
  const { profile } = await requireAcessoCliente(d.clienteId)
  const supabase = await createClient()

  const { error: cenaError } = await supabase
    .from('imagens_cenas')
    .update({
      status: 'testado_reprovado',
      nota_regua: `${d.dimensao_regua}: ${d.descricao_erro}`,
    })
    .eq('id', d.cenaId)
  if (cenaError) return { error: 'Erro ao reprovar cena.' }

  if (d.caso_existente_id) {
    // Mesmo padrão de erro já registrado → incrementa vezes_visto
    const { data: caso } = await supabase
      .from('imagens_casos_calibracao')
      .select('vezes_visto')
      .eq('id', d.caso_existente_id)
      .single()
    if (!caso) return { error: 'Caso existente não encontrado.' }

    const { error } = await supabase
      .from('imagens_casos_calibracao')
      .update({
        vezes_visto: caso.vezes_visto + 1,
        ...(d.correcao_aplicada ? { correcao_aplicada: d.correcao_aplicada } : {}),
      })
      .eq('id', d.caso_existente_id)
    if (error) return { error: 'Erro ao atualizar caso de calibração.' }
  } else {
    const { error } = await supabase.from('imagens_casos_calibracao').insert({
      organization_id: profile.organization_id,
      cliente_id: d.clienteId,
      cena_id: d.cenaId,
      escopo_do_erro: d.escopo_do_erro,
      dimensao_regua: d.dimensao_regua,
      descricao_erro: d.descricao_erro,
      correcao_aplicada: d.correcao_aplicada || null,
    })
    if (error) return { error: 'Erro ao registrar caso de calibração.' }
  }

  revalidatePath(`/imagens/${d.clienteId}/historico`)
  revalidatePath('/imagens/calibracao')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Calibração (promoção — só admin)
// ---------------------------------------------------------------------------

const promocaoSchema = z.object({
  casoId: z.string().uuid(),
  destino: z.enum(['bloco_mestre', 'ficha_produto', 'patch_tecnico']),
  /** texto final da regra, revisado pelo admin no preview */
  texto_final: z.string().trim().min(1).max(4000),
  /** obrigatório quando destino = ficha_produto */
  produto_id: z.string().uuid().nullable(),
  /** usados quando destino = patch_tecnico */
  patch_nome: z.string().trim().max(200),
  patch_palavras_chave: z.array(z.string().trim()).max(30),
})

export async function actionPromoverCaso(
  input: z.infer<typeof promocaoSchema>,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = promocaoSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos.' }
  const d = parsed.data
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  const { data: caso } = await supabase
    .from('imagens_casos_calibracao')
    .select('id, cliente_id, escopo_do_erro, status, descricao_erro, dimensao_regua')
    .eq('id', d.casoId)
    .single()
  if (!caso) return { error: 'Caso não encontrado.' }
  if (caso.status !== 'candidato') return { error: 'Este caso já foi promovido ou descartado.' }

  // Regra crítica: erro específico de um cliente NUNCA vira patch global —
  // revalidado no server, não só na UI.
  if (d.destino === 'patch_tecnico' && caso.escopo_do_erro !== 'tecnico_universal') {
    return {
      error:
        'Erro específico deste cliente não pode virar Patch Técnico global. ' +
        'Promova para o Bloco Mestre ou a Ficha de Produto deste cliente.',
    }
  }

  let promovidoPara: string

  if (d.destino === 'bloco_mestre') {
    const { data: bloco } = await supabase
      .from('imagens_bloco_mestre')
      .select('id, negativos_padrao')
      .eq('cliente_id', caso.cliente_id)
      .single()
    if (!bloco) return { error: 'Este cliente ainda não tem Bloco Mestre.' }

    const { error } = await supabase
      .from('imagens_bloco_mestre')
      .update({ negativos_padrao: [...bloco.negativos_padrao, d.texto_final] })
      .eq('id', bloco.id)
    if (error) return { error: 'Erro ao atualizar Bloco Mestre.' }
    promovidoPara = 'bloco_mestre'
  } else if (d.destino === 'ficha_produto') {
    if (!d.produto_id) return { error: 'Selecione o produto de destino.' }
    const { data: produto } = await supabase
      .from('imagens_produtos')
      .select('id, cliente_id, regra_geracao')
      .eq('id', d.produto_id)
      .single()
    if (!produto || produto.cliente_id !== caso.cliente_id) {
      return { error: 'Produto inválido para este cliente.' }
    }

    const regraAtual = produto.regra_geracao?.trim()
    const { error } = await supabase
      .from('imagens_produtos')
      .update({
        regra_geracao: regraAtual ? `${regraAtual}\n${d.texto_final}` : d.texto_final,
      })
      .eq('id', produto.id)
    if (error) return { error: 'Erro ao atualizar Ficha de Produto.' }
    promovidoPara = `ficha_produto:${produto.id}`
  } else {
    const { data: patch, error } = await supabase
      .from('imagens_patches_tecnicos')
      .insert({
        organization_id: profile.organization_id,
        nome: d.patch_nome || caso.dimensao_regua || 'patch-sem-nome',
        quando_usar: caso.descricao_erro,
        snippet_texto: d.texto_final,
        palavras_chave: d.patch_palavras_chave.filter(Boolean),
        origem_caso_id: caso.id,
      })
      .select('id')
      .single()
    if (error || !patch) return { error: 'Erro ao criar Patch Técnico.' }
    promovidoPara = `patch_tecnico:${patch.id}`
  }

  const { error: casoError } = await supabase
    .from('imagens_casos_calibracao')
    .update({
      status: 'promovido',
      promovido_para: promovidoPara,
      promovido_por: profile.id,
      promovido_em: new Date().toISOString(),
    })
    .eq('id', caso.id)
  if (casoError) return { error: 'Regra aplicada, mas houve erro ao marcar o caso.' }

  revalidatePath('/imagens/calibracao')
  revalidatePath(`/imagens/${caso.cliente_id}`, 'layout')
  return { ok: true }
}

export async function actionDescartarCaso(
  casoId: string,
): Promise<{ ok?: boolean; error?: string }> {
  await requireImagensAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('imagens_casos_calibracao')
    .update({ status: 'descartado' })
    .eq('id', casoId)
    .eq('status', 'candidato')
  if (error) return { error: 'Erro ao descartar caso.' }
  revalidatePath('/imagens/calibracao')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Acessos (usuário de produção × cliente) — só admin
// ---------------------------------------------------------------------------

export async function actionToggleAcesso(
  profileId: string,
  clienteId: string,
  liberar: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const { profile } = await requireImagensAdmin()
  const supabase = await createClient()

  if (liberar) {
    const { error } = await supabase.from('imagens_acesso').upsert(
      {
        organization_id: profile.organization_id,
        profile_id: profileId,
        cliente_id: clienteId,
      },
      { onConflict: 'profile_id,cliente_id' },
    )
    if (error) return { error: 'Erro ao liberar acesso.' }
  } else {
    const { error } = await supabase
      .from('imagens_acesso')
      .delete()
      .eq('profile_id', profileId)
      .eq('cliente_id', clienteId)
    if (error) return { error: 'Erro ao remover acesso.' }
  }

  revalidatePath('/imagens/acessos')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Upload de imagens (referência de produto/personagem, resultado de cena)
// Bucket privado content-files, path imagens/{org}/{cliente}/... — acesso
// sempre via service role + URL assinada (padrão do repo).
// ---------------------------------------------------------------------------

const MIME_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const TAMANHO_MAX_IMG = 10 * 1024 * 1024 // 10 MB

type AlvoUpload = 'produto' | 'personagem' | 'cena'

const TABELA_UPLOAD: Record<AlvoUpload, 'imagens_produtos' | 'imagens_personagens' | 'imagens_cenas'> = {
  produto: 'imagens_produtos',
  personagem: 'imagens_personagens',
  cena: 'imagens_cenas',
}

export async function actionUploadImagem(
  alvo: AlvoUpload,
  registroId: string,
  clienteId: string,
  formData: FormData,
): Promise<{ ok?: boolean; url?: string; error?: string }> {
  // Referências de produto/personagem são cadastro (admin); resultado de cena
  // é fluxo de produção (qualquer um com acesso ao cliente).
  const { profile } =
    alvo === 'cena'
      ? await requireAcessoCliente(clienteId)
      : await requireImagensAdmin()

  const file = formData.get('arquivo') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (!MIME_IMAGEM.has(file.type)) return { error: 'Envie uma imagem (JPG, PNG, WebP ou GIF).' }
  if (file.size > TAMANHO_MAX_IMG) return { error: 'Imagem muito grande. Máximo: 10 MB.' }

  const supabase = await createClient()
  const tabela = TABELA_UPLOAD[alvo]

  // RLS garante que o registro pertence ao cliente/org acessível
  const { data: registro } = await supabase
    .from(tabela)
    .select('id, cliente_id')
    .eq('id', registroId)
    .single()
  if (!registro || registro.cliente_id !== clienteId) {
    return { error: 'Registro não encontrado.' }
  }

  const service = createServiceClient()
  const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `imagens/${profile.organization_id}/${clienteId}/${alvo}/${Date.now()}-${nomeSeguro}`

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await service.storage
    .from('content-files')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[actionUploadImagem] storage:', uploadError.message)
    return { error: 'Erro ao enviar imagem. Tente novamente.' }
  }

  const { error: updateError } =
    alvo === 'produto'
      ? await supabase
          .from('imagens_produtos')
          .update({ imagem_referencia_path: storagePath })
          .eq('id', registroId)
      : alvo === 'personagem'
        ? await supabase
            .from('imagens_personagens')
            .update({ imagem_referencia_path: storagePath })
            .eq('id', registroId)
        : await supabase
            .from('imagens_cenas')
            .update({ imagem_resultado_path: storagePath })
            .eq('id', registroId)
  if (updateError) {
    await service.storage.from('content-files').remove([storagePath])
    return { error: 'Erro ao registrar imagem.' }
  }

  const { data: signed } = await service.storage
    .from('content-files')
    .createSignedUrl(storagePath, 3600)

  revalidatePath(`/imagens/${clienteId}`, 'layout')
  return { ok: true, url: signed?.signedUrl }
}
