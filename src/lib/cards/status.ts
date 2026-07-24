import type { StatusCard } from '@/types/database'

// ---------------------------------------------------------------------------
// Fonte única de verdade do status do card.
//
// Antes disto a ordem das colunas estava repetida em três lugares
// (KanbanBoard, CardDetailDrawer, StatusChip) e existiam DOIS mapas de
// rótulo/cor — STATUS_CONFIG e COLUMN_CONFIG — que já haviam divergido nas
// cores. Tudo passa a sair daqui.
// ---------------------------------------------------------------------------

/** Ordem do fluxo, da esquerda para a direita no board. */
export const ORDEM_STATUS: readonly StatusCard[] = [
  'aguardando_info',
  'a_fazer',
  'em_andamento',
  'para_aprovacao',
  'necessita_ajustes',
  'concluido',
  'cancelado',
] as const

export interface StatusVisual {
  label: string
  /** Chip inline: texto + fundo + borda. */
  className: string
  /** Fundo suave, para superfícies grandes. */
  bg: string
  /** Borda superior do cabeçalho da coluna. */
  headerClass: string
  /** Contador no cabeçalho da coluna. */
  countClass: string
  /** Mensagem da Izzi quando a coluna está vazia. */
  vazioMsg: string
}

export const STATUS_CONFIG: Record<StatusCard, StatusVisual> = {
  aguardando_info: {
    label: 'Aguardando Info',
    className: 'text-amber-700 bg-amber-50 border-amber-200',
    bg: 'bg-amber-50',
    headerClass: 'border-t-amber-400',
    countClass: 'bg-amber-100 text-amber-700',
    vazioMsg: 'Nenhuma demanda aguardando informações.',
  },
  a_fazer: {
    label: 'A Fazer',
    className: 'text-zinc-600 bg-zinc-100 border-zinc-200',
    bg: 'bg-zinc-50',
    headerClass: 'border-t-zinc-300',
    countClass: 'bg-zinc-100 text-zinc-600',
    vazioMsg: 'Tudo certo por aqui.',
  },
  em_andamento: {
    label: 'Em Andamento',
    className: 'text-blue-700 bg-blue-50 border-blue-200',
    bg: 'bg-blue-50',
    headerClass: 'border-t-blue-400',
    countClass: 'bg-blue-100 text-blue-700',
    vazioMsg: 'Nada em produção no momento.',
  },
  para_aprovacao: {
    label: 'Para Aprovação',
    className: 'text-violet-700 bg-violet-50 border-violet-200',
    bg: 'bg-violet-50',
    headerClass: 'border-t-violet-400',
    countClass: 'bg-violet-100 text-violet-700',
    vazioMsg: 'Sem aprovações pendentes.',
  },
  necessita_ajustes: {
    label: 'Necessita Ajustes',
    className: 'text-orange-700 bg-orange-50 border-orange-200',
    bg: 'bg-orange-50',
    headerClass: 'border-t-orange-400',
    countClass: 'bg-orange-100 text-orange-700',
    vazioMsg: 'Sem ajustes pendentes!',
  },
  concluido: {
    label: 'Concluído',
    className: 'text-green-700 bg-green-50 border-green-200',
    bg: 'bg-green-50',
    headerClass: 'border-t-green-400',
    countClass: 'bg-green-100 text-green-700',
    vazioMsg: 'As entregas concluídas aparecem aqui.',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'text-red-600 bg-red-50 border-red-200',
    bg: 'bg-red-50',
    headerClass: 'border-t-red-400',
    countClass: 'bg-red-100 text-red-600',
    vazioMsg: 'Nenhum card cancelado.',
  },
}

// ---------------------------------------------------------------------------
// Transições
//
// Três status NÃO são alcançáveis por arrastar ou por clique na grade de
// status, porque cada um carrega efeitos que o movimento simples pularia:
//
//   para_aprovacao  exige arquivo de entrega, grava em `aprovacoes`, dispara
//                   e-mail e WhatsApp para o cliente
//   concluido       é consequência de o CLIENTE aprovar, não uma escolha da equipe
//   cancelado       exige motivo registrado
//
// É a "regra crítica" do CLAUDE.md, que até aqui existia só na documentação:
// actionMoverCard aceitava qualquer destino sem validar. Como RLS não ajuda
// aqui, a checagem é de aplicação — e mora neste módulo para que servidor e
// UI usem exatamente a mesma regra.
// ---------------------------------------------------------------------------

/** Destinos permitidos por movimento direto (drag & drop ou grade de status). */
export const TRANSICOES_LIVRES: Record<StatusCard, readonly StatusCard[]> = {
  aguardando_info: ['a_fazer', 'em_andamento'],
  a_fazer: ['aguardando_info', 'em_andamento'],
  em_andamento: ['aguardando_info', 'a_fazer'],
  necessita_ajustes: ['a_fazer', 'em_andamento'],
  // Retratar um envio: a equipe percebeu algo antes de o cliente responder.
  para_aprovacao: ['em_andamento'],
  // Estados finais: reabrir é decisão deliberada, não um arrastar de card.
  concluido: [],
  cancelado: [],
}

/** Ação dedicada que deve ser usada para chegar a cada status protegido. */
const ACAO_EXIGIDA: Partial<Record<StatusCard, string>> = {
  para_aprovacao:
    'Use “Enviar para aprovação” no card. É preciso ter um arquivo de entrega anexado — o cliente é notificado por e-mail e WhatsApp.',
  concluido:
    'A demanda é concluída quando o cliente aprova a entrega. A equipe não conclui diretamente.',
  cancelado: 'Use “Cancelar demanda” no card. O motivo do cancelamento é obrigatório.',
}

/**
 * Diz por que uma transição não pode acontecer por movimento direto.
 * Devolve `null` quando o movimento é permitido.
 */
export function motivoBloqueio(de: StatusCard, para: StatusCard): string | null {
  if (de === para) return null
  if (TRANSICOES_LIVRES[de].includes(para)) return null

  const acao = ACAO_EXIGIDA[para]
  if (acao) return acao

  if (de === 'concluido') {
    return 'Esta demanda já foi concluída pelo cliente e não volta ao fluxo por aqui.'
  }
  if (de === 'cancelado') {
    return 'Esta demanda foi cancelada. Duplique-a para retomar o trabalho.'
  }

  return `Não é possível mover de “${STATUS_CONFIG[de].label}” para “${STATUS_CONFIG[para].label}”.`
}

/** Atalho booleano de `motivoBloqueio`. */
export function podeMover(de: StatusCard, para: StatusCard): boolean {
  return motivoBloqueio(de, para) === null
}
