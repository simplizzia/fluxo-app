'use server'

import { z } from 'zod'
import { requireSocia } from '@/lib/dal'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmail, emailConviteApp } from '@/lib/email'

const InviteSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, { message: 'Nome deve ter pelo menos 2 caracteres.' }),
    email: z
      .string()
      .trim()
      .email({ message: 'E-mail inválido.' }),
    papel: z.enum(['gestao', 'atendimento', 'executor', 'socia', 'cliente'] as const, {
      message: 'Papel inválido.',
    }),
    // Só se aplica a papel = 'cliente'. É o vínculo que torna o acesso do
    // cliente utilizável — ver comentário em vincularContatoCliente abaixo.
    cliente_id: z.string().uuid({ message: 'Selecione um cliente.' }).optional().or(z.literal('')),
    sub_papel: z
      .enum(['responsavel', 'colaborador', 'observador'] as const)
      .optional(),
  })
  .refine((d) => d.papel !== 'cliente' || (d.cliente_id && d.cliente_id.length > 0), {
    message: 'Escolha a qual cliente esta pessoa pertence.',
    path: ['cliente_id'],
  })

export type InviteState = {
  errors?: {
    nome?: string[]
    email?: string[]
    papel?: string[]
    cliente_id?: string[]
  }
  message?: string
  success?: boolean
} | null

export async function actionConvidarUsuario(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const socia = await requireSocia()

  const validated = InviteSchema.safeParse({
    nome: formData.get('nome'),
    email: formData.get('email'),
    papel: formData.get('papel'),
    cliente_id: formData.get('cliente_id') ?? '',
    sub_papel: formData.get('sub_papel') || undefined,
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { nome, email, papel, cliente_id, sub_papel } = validated.data

  const supabase = createServiceClient()

  // Um cliente_id vindo do formulário nunca é confiável: confirma que pertence
  // à organização da sócia antes de criar qualquer vínculo.
  if (papel === 'cliente') {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', cliente_id as string)
      .eq('organization_id', socia.organization_id)
      .maybeSingle()

    if (!cliente) {
      return { errors: { cliente_id: ['Cliente não encontrado nesta organização.'] } }
    }
  }

  // Gera o link de convite sem disparar o email do Supabase
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: {
        nome,
        papel,
        organization_id: socia.organization_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
    },
  })

  if (error) {
    console.error('[actionConvidarUsuario] generateLink error:', error.message)
    return {
      message:
        error.message.includes('already registered')
          ? 'Este e-mail já possui um acesso cadastrado.'
          : 'Erro ao gerar convite. Tente novamente.',
    }
  }

  // Vincula o usuário recém-criado ao cliente.
  //
  // Sem esta linha o papel `cliente` é inalcançável: toda policy de cliente
  // filtra por `cliente_id = ANY(auth_cliente_ids())`, e auth_cliente_ids() lê
  // exatamente esta tabela. Sem o vínculo a função devolve NULL, toda policy
  // resolve para falso, e a pessoa entra num app inteiramente vazio — board,
  // relatórios e marca sem uma linha sequer.
  if (papel === 'cliente' && data.user) {
    const { error: vinculoErr } = await supabase.from('contatos_cliente').insert({
      organization_id: socia.organization_id,
      cliente_id: cliente_id as string,
      user_id: data.user.id,
      sub_papel: sub_papel ?? 'responsavel',
      ativo: true,
    })

    if (vinculoErr) {
      // Não envia o convite: um acesso de cliente sem vínculo só produz uma
      // tela vazia e uma dúvida. Melhor falhar aqui, de forma visível.
      console.error('[actionConvidarUsuario] vínculo contatos_cliente:', vinculoErr.message)
      return {
        message:
          'O acesso foi criado, mas não foi possível vinculá-lo ao cliente. ' +
          'Remova o usuário em Administração › Usuários e tente novamente.',
      }
    }
  }

  const inviteLink = data.properties.action_link
  const { subject, html } = emailConviteApp({ nome, papel, link: inviteLink })
  await enviarEmail(email, subject, html)

  return { success: true }
}
