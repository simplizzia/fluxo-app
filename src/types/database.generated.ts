export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      action_items_reuniao: {
        Row: {
          card_id: string | null
          confirmado: boolean
          created_at: string
          descricao: string
          id: string
          organization_id: string
          prazo_sugerido: string | null
          responsavel_sugerido_id: string | null
          reuniao_id: string
        }
        Insert: {
          card_id?: string | null
          confirmado?: boolean
          created_at?: string
          descricao: string
          id?: string
          organization_id: string
          prazo_sugerido?: string | null
          responsavel_sugerido_id?: string | null
          reuniao_id: string
        }
        Update: {
          card_id?: string | null
          confirmado?: boolean
          created_at?: string
          descricao?: string
          id?: string
          organization_id?: string
          prazo_sugerido?: string | null
          responsavel_sugerido_id?: string | null
          reuniao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_reuniao_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_reuniao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_reuniao_responsavel_sugerido_id_fkey"
            columns: ["responsavel_sugerido_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_reuniao_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_catalog: {
        Row: {
          ativo: boolean
          chave: string
          criado_em: string
          descricao: string
          id: string
          inputs_schema: Json
          nome: string
          padrao: string
          papeis_permitidos: string[]
          prompt_sistema: string
          time_nome: string
          time_numero: number
          tipo_demanda_slug: string | null
        }
        Insert: {
          ativo?: boolean
          chave: string
          criado_em?: string
          descricao?: string
          id?: string
          inputs_schema?: Json
          nome: string
          padrao: string
          papeis_permitidos?: string[]
          prompt_sistema?: string
          time_nome: string
          time_numero?: number
          tipo_demanda_slug?: string | null
        }
        Update: {
          ativo?: boolean
          chave?: string
          criado_em?: string
          descricao?: string
          id?: string
          inputs_schema?: Json
          nome?: string
          padrao?: string
          papeis_permitidos?: string[]
          prompt_sistema?: string
          time_nome?: string
          time_numero?: number
          tipo_demanda_slug?: string | null
        }
        Relationships: []
      }
      agent_feedback: {
        Row: {
          agent_id: string
          avaliacao: string
          avaliado_por: string | null
          cliente_id: string | null
          comentario: string | null
          criado_em: string
          id: string
          organization_id: string
          run_id: string
        }
        Insert: {
          agent_id: string
          avaliacao: string
          avaliado_por?: string | null
          cliente_id?: string | null
          comentario?: string | null
          criado_em?: string
          id?: string
          organization_id: string
          run_id: string
        }
        Update: {
          agent_id?: string
          avaliacao?: string
          avaliado_por?: string | null
          cliente_id?: string | null
          comentario?: string | null
          criado_em?: string
          id?: string
          organization_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_avaliado_por_fkey"
            columns: ["avaliado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_insights: {
        Row: {
          agent_id: string
          atualizado_em: string
          cliente_id: string | null
          id: string
          organization_id: string
          padroes_negativos: Json
          padroes_positivos: Json
          resumo: string
          sugestoes: Json
          taxa_aprovacao: number | null
          total_feedbacks: number
        }
        Insert: {
          agent_id: string
          atualizado_em?: string
          cliente_id?: string | null
          id?: string
          organization_id: string
          padroes_negativos?: Json
          padroes_positivos?: Json
          resumo?: string
          sugestoes?: Json
          taxa_aprovacao?: number | null
          total_feedbacks?: number
        }
        Update: {
          agent_id?: string
          atualizado_em?: string
          cliente_id?: string | null
          id?: string
          organization_id?: string
          padroes_negativos?: Json
          padroes_positivos?: Json
          resumo?: string
          sugestoes?: Json
          taxa_aprovacao?: number | null
          total_feedbacks?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_insights_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          atualizado_em: string
          card_id: string | null
          cliente_id: string | null
          criado_em: string
          duracao_ms: number | null
          erro: string | null
          id: string
          input: Json
          marca_id: string | null
          organization_id: string
          output: Json | null
          status: string
          tokens_input: number | null
          tokens_output: number | null
          triggered_by: string | null
        }
        Insert: {
          agent_id: string
          atualizado_em?: string
          card_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          id?: string
          input?: Json
          marca_id?: string | null
          organization_id: string
          output?: Json | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          triggered_by?: string | null
        }
        Update: {
          agent_id?: string
          atualizado_em?: string
          card_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          duracao_ms?: number | null
          erro?: string | null
          id?: string
          input?: Json
          marca_id?: string | null
          organization_id?: string
          output?: Json | null
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacao_slides: {
        Row: {
          apresentacao_id: string
          conteudo: Json
          created_at: string
          id: string
          ordem: number
          organization_id: string
          tipo: Database["public"]["Enums"]["tipo_slide"]
          updated_at: string
        }
        Insert: {
          apresentacao_id: string
          conteudo?: Json
          created_at?: string
          id?: string
          ordem: number
          organization_id: string
          tipo: Database["public"]["Enums"]["tipo_slide"]
          updated_at?: string
        }
        Update: {
          apresentacao_id?: string
          conteudo?: Json
          created_at?: string
          id?: string
          ordem?: number
          organization_id?: string
          tipo?: Database["public"]["Enums"]["tipo_slide"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacao_slides_apresentacao_id_fkey"
            columns: ["apresentacao_id"]
            isOneToOne: false
            referencedRelation: "apresentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacao_slides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      apresentacoes: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          slug: string
          status: Database["public"]["Enums"]["status_apresentacao"]
          tema: Json
          titulo: string
          token: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          slug: string
          status?: Database["public"]["Enums"]["status_apresentacao"]
          tema?: Json
          titulo: string
          token?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["status_apresentacao"]
          tema?: Json
          titulo?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apresentacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apresentacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      aprovacoes: {
        Row: {
          aprovado_por: string
          card_id: string
          comentario: string | null
          created_at: string
          decisao: Database["public"]["Enums"]["decisao_aprovacao"]
          id: string
          interna: boolean
          organization_id: string
          rodada: number
        }
        Insert: {
          aprovado_por: string
          card_id: string
          comentario?: string | null
          created_at?: string
          decisao: Database["public"]["Enums"]["decisao_aprovacao"]
          id?: string
          interna?: boolean
          organization_id: string
          rodada?: number
        }
        Update: {
          aprovado_por?: string
          card_id?: string
          comentario?: string | null
          created_at?: string
          decisao?: Database["public"]["Enums"]["decisao_aprovacao"]
          id?: string
          interna?: boolean
          organization_id?: string
          rodada?: number
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aprovacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos: {
        Row: {
          card_id: string
          created_at: string
          id: string
          mime_type: string
          nome_arquivo: string
          organization_id: string
          tamanho_bytes: number
          tipo: Database["public"]["Enums"]["tipo_arquivo"]
          uploaded_by: string
          url: string
          versao: number | null
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          mime_type: string
          nome_arquivo: string
          organization_id: string
          tamanho_bytes: number
          tipo: Database["public"]["Enums"]["tipo_arquivo"]
          uploaded_by: string
          url: string
          versao?: number | null
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          nome_arquivo?: string
          organization_id?: string
          tamanho_bytes?: number
          tipo?: Database["public"]["Enums"]["tipo_arquivo"]
          uploaded_by?: string
          url?: string
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_parceiros: {
        Row: {
          created_at: string
          criado_por: string | null
          custo_estimado: number | null
          data_prevista: string | null
          descricao: string | null
          destinatario_tipo: string
          gerado_por_ia: boolean
          id: string
          observacoes: string | null
          organization_id: string
          parceiro_ids: string[] | null
          status: Database["public"]["Enums"]["status_atividade"]
          tipo: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          custo_estimado?: number | null
          data_prevista?: string | null
          descricao?: string | null
          destinatario_tipo?: string
          gerado_por_ia?: boolean
          id?: string
          observacoes?: string | null
          organization_id: string
          parceiro_ids?: string[] | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tipo?: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          custo_estimado?: number | null
          data_prevista?: string | null
          descricao?: string | null
          destinatario_tipo?: string
          gerado_por_ia?: boolean
          id?: string
          observacoes?: string | null
          organization_id?: string
          parceiro_ids?: string[] | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tipo?: Database["public"]["Enums"]["tipo_atividade"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_parceiros_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_parceiros_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          ip_address: string | null
          metadata: Json
          organization_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          detalhes: Json
          entidade: string
          entidade_id: string
          executado_em: string
          id: string
          organization_id: string
          rule_id: string
          sucesso: boolean
        }
        Insert: {
          detalhes?: Json
          entidade: string
          entidade_id: string
          executado_em?: string
          id?: string
          organization_id: string
          rule_id: string
          sucesso: boolean
        }
        Update: {
          detalhes?: Json
          entidade?: string
          entidade_id?: string
          executado_em?: string
          id?: string
          organization_id?: string
          rule_id?: string
          sucesso?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          acoes: Json
          ativa: boolean
          condicoes: Json
          created_at: string
          descricao: string | null
          gatilho: string
          id: string
          nome: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          acoes?: Json
          ativa?: boolean
          condicoes?: Json
          created_at?: string
          descricao?: string | null
          gatilho: string
          id?: string
          nome: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          acoes?: Json
          ativa?: boolean
          condicoes?: Json
          created_at?: string
          descricao?: string | null
          gatilho?: string
          id?: string
          nome?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_cliente: {
        Row: {
          cliente_id: string
          comentario: string | null
          comunicacao: number | null
          enviado_em: string
          id: string
          nps: number | null
          organization_id: string
          qualidade: number | null
          respondido_em: string | null
          token_unico: string
        }
        Insert: {
          cliente_id: string
          comentario?: string | null
          comunicacao?: number | null
          enviado_em?: string
          id?: string
          nps?: number | null
          organization_id: string
          qualidade?: number | null
          respondido_em?: string | null
          token_unico?: string
        }
        Update: {
          cliente_id?: string
          comentario?: string | null
          comunicacao?: number | null
          enviado_em?: string
          id?: string
          nps?: number | null
          organization_id?: string
          qualidade?: number | null
          respondido_em?: string | null
          token_unico?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_cliente_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_colaborador: {
        Row: {
          colaborador_id: string
          created_at: string
          criterios: Json
          id: string
          nota_geral: number
          observacao: string | null
          organization_id: string
          registrado_por: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          criterios?: Json
          id?: string
          nota_geral: number
          observacao?: string | null
          organization_id: string
          registrado_por: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          criterios?: Json
          id?: string
          nota_geral?: number
          observacao?: string | null
          organization_id?: string
          registrado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_colaborador_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_colaborador_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_equipe: {
        Row: {
          agendado_para: string | null
          conteudo: string
          created_at: string
          criado_por: string
          destinatarios: string
          id: string
          imagem_url: string | null
          link_label: string | null
          link_url: string | null
          organization_id: string
          parceiro_ids: string[] | null
          publicado_em: string | null
          titulo: string
        }
        Insert: {
          agendado_para?: string | null
          conteudo: string
          created_at?: string
          criado_por: string
          destinatarios?: string
          id?: string
          imagem_url?: string | null
          link_label?: string | null
          link_url?: string | null
          organization_id: string
          parceiro_ids?: string[] | null
          publicado_em?: string | null
          titulo: string
        }
        Update: {
          agendado_para?: string | null
          conteudo?: string
          created_at?: string
          criado_por?: string
          destinatarios?: string
          id?: string
          imagem_url?: string | null
          link_label?: string | null
          link_url?: string | null
          organization_id?: string
          parceiro_ids?: string[] | null
          publicado_em?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_equipe_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_equipe_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_visualizacoes: {
        Row: {
          aviso_id: string
          user_id: string
          visualizado_em: string
        }
        Insert: {
          aviso_id: string
          user_id: string
          visualizado_em?: string
        }
        Update: {
          aviso_id?: string
          user_id?: string
          visualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_visualizacoes_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos_equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_visualizacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges_conquistados: {
        Row: {
          badge_id: string
          card_id: string | null
          conquistado_em: string
          id: string
          organization_id: string
          usuario_id: string
        }
        Insert: {
          badge_id: string
          card_id?: string | null
          conquistado_em?: string
          id?: string
          organization_id: string
          usuario_id: string
        }
        Update: {
          badge_id?: string
          card_id?: string | null
          conquistado_em?: string
          id?: string
          organization_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_conquistados_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges_definicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_conquistados_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_conquistados_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_conquistados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges_definicoes: {
        Row: {
          ativo: boolean
          beneficio_descricao: string | null
          created_at: string
          criterios: Json
          descricao: string
          icone: string
          id: string
          nome: string
          organization_id: string
          tipo: Database["public"]["Enums"]["tipo_badge"]
        }
        Insert: {
          ativo?: boolean
          beneficio_descricao?: string | null
          created_at?: string
          criterios?: Json
          descricao: string
          icone: string
          id?: string
          nome: string
          organization_id: string
          tipo: Database["public"]["Enums"]["tipo_badge"]
        }
        Update: {
          ativo?: boolean
          beneficio_descricao?: string | null
          created_at?: string
          criterios?: Json
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          organization_id?: string
          tipo?: Database["public"]["Enums"]["tipo_badge"]
        }
        Relationships: [
          {
            foreignKeyName: "badges_definicoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      card_status_history: {
        Row: {
          alterado_por: string
          card_id: string
          created_at: string
          id: string
          organization_id: string
          status_anterior: Database["public"]["Enums"]["status_card"] | null
          status_novo: Database["public"]["Enums"]["status_card"]
        }
        Insert: {
          alterado_por: string
          card_id: string
          created_at?: string
          id?: string
          organization_id: string
          status_anterior?: Database["public"]["Enums"]["status_card"] | null
          status_novo: Database["public"]["Enums"]["status_card"]
        }
        Update: {
          alterado_por?: string
          card_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          status_anterior?: Database["public"]["Enums"]["status_card"] | null
          status_novo?: Database["public"]["Enums"]["status_card"]
        }
        Relationships: [
          {
            foreignKeyName: "card_status_history_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_status_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          campos_publicos: Json
          cliente_id: string | null
          concluido_em: string | null
          confidencial: boolean
          created_at: string
          creditos_consumidos: number | null
          criado_por: string | null
          data_entrega_programada: string | null
          data_publicacao: string | null
          fluxo_etapa_id: string | null
          horas_estimadas: number | null
          horas_realizadas: number | null
          id: string
          marca_id: string | null
          motivo_cancelamento: string | null
          organization_id: string
          prazo_cliente: string | null
          prazo_interno: string | null
          prioridade: Database["public"]["Enums"]["prioridade_card"]
          responsavel_id: string | null
          rodadas_revisao: number
          sla_iniciado_em: string | null
          sla_respondido_em: string | null
          status: Database["public"]["Enums"]["status_card"]
          tipo_id: string | null
          titulo: string
          updated_at: string
          versao_entrega_atual: number | null
        }
        Insert: {
          campos_publicos?: Json
          cliente_id?: string | null
          concluido_em?: string | null
          confidencial?: boolean
          created_at?: string
          creditos_consumidos?: number | null
          criado_por?: string | null
          data_entrega_programada?: string | null
          data_publicacao?: string | null
          fluxo_etapa_id?: string | null
          horas_estimadas?: number | null
          horas_realizadas?: number | null
          id?: string
          marca_id?: string | null
          motivo_cancelamento?: string | null
          organization_id: string
          prazo_cliente?: string | null
          prazo_interno?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_card"]
          responsavel_id?: string | null
          rodadas_revisao?: number
          sla_iniciado_em?: string | null
          sla_respondido_em?: string | null
          status?: Database["public"]["Enums"]["status_card"]
          tipo_id?: string | null
          titulo: string
          updated_at?: string
          versao_entrega_atual?: number | null
        }
        Update: {
          campos_publicos?: Json
          cliente_id?: string | null
          concluido_em?: string | null
          confidencial?: boolean
          created_at?: string
          creditos_consumidos?: number | null
          criado_por?: string | null
          data_entrega_programada?: string | null
          data_publicacao?: string | null
          fluxo_etapa_id?: string | null
          horas_estimadas?: number | null
          horas_realizadas?: number | null
          id?: string
          marca_id?: string | null
          motivo_cancelamento?: string | null
          organization_id?: string
          prazo_cliente?: string | null
          prazo_interno?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_card"]
          responsavel_id?: string | null
          rodadas_revisao?: number
          sla_iniciado_em?: string | null
          sla_respondido_em?: string | null
          status?: Database["public"]["Enums"]["status_card"]
          tipo_id?: string | null
          titulo?: string
          updated_at?: string
          versao_entrega_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_fluxo_etapa_id_fkey"
            columns: ["fluxo_etapa_id"]
            isOneToOne: false
            referencedRelation: "fluxo_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_tipo_id_fkey"
            columns: ["tipo_id"]
            isOneToOne: false
            referencedRelation: "tipos_demanda"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_internos: {
        Row: {
          card_id: string
          created_at: string
          dados: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          card_id: string
          created_at?: string
          dados?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          dados?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_internos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_internos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          data_inativacao: string | null
          id: string
          logo_url: string | null
          nome: string
          organization_id: string
          slug: string
          status: Database["public"]["Enums"]["status_cliente"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_inativacao?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          organization_id: string
          slug: string
          status?: Database["public"]["Enums"]["status_cliente"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_inativacao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          organization_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["status_cliente"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_mapa: {
        Row: {
          created_at: string
          data_inicio: string
          especialidades: string[]
          id: string
          observacoes: string | null
          organization_id: string
          regime: Database["public"]["Enums"]["regime_colaborador"]
          status: Database["public"]["Enums"]["status_colaborador"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inicio: string
          especialidades?: string[]
          id?: string
          observacoes?: string | null
          organization_id: string
          regime?: Database["public"]["Enums"]["regime_colaborador"]
          status?: Database["public"]["Enums"]["status_colaborador"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inicio?: string
          especialidades?: string[]
          id?: string
          observacoes?: string | null
          organization_id?: string
          regime?: Database["public"]["Enums"]["regime_colaborador"]
          status?: Database["public"]["Enums"]["status_colaborador"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_mapa_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_mapa_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios: {
        Row: {
          autor_id: string
          card_id: string
          created_at: string
          id: string
          organization_id: string
          texto: string
          visivel_para_cliente: boolean
        }
        Insert: {
          autor_id: string
          card_id: string
          created_at?: string
          id?: string
          organization_id: string
          texto: string
          visivel_para_cliente?: boolean
        }
        Update: {
          autor_id?: string
          card_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          texto?: string
          visivel_para_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_cliente: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          id: string
          organization_id: string
          sub_papel: Database["public"]["Enums"]["sub_papel_contato"]
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          id?: string
          organization_id: string
          sub_papel?: Database["public"]["Enums"]["sub_papel_contato"]
          user_id: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          sub_papel?: Database["public"]["Enums"]["sub_papel_contato"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_cliente_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_itens: {
        Row: {
          card_id: string | null
          created_at: string
          cronograma_id: string
          data_publicacao: string | null
          detalhamento: Json
          formato: string | null
          horario: string | null
          id: string
          legenda: string | null
          marca_id: string | null
          ordem: number
          organization_id: string
          pendencia: string | null
          pilar: string | null
          produto_id: string | null
          tema: string | null
          updated_at: string
          viabilidade: Database["public"]["Enums"]["viabilidade_item"]
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          cronograma_id: string
          data_publicacao?: string | null
          detalhamento?: Json
          formato?: string | null
          horario?: string | null
          id?: string
          legenda?: string | null
          marca_id?: string | null
          ordem?: number
          organization_id: string
          pendencia?: string | null
          pilar?: string | null
          produto_id?: string | null
          tema?: string | null
          updated_at?: string
          viabilidade?: Database["public"]["Enums"]["viabilidade_item"]
        }
        Update: {
          card_id?: string | null
          created_at?: string
          cronograma_id?: string
          data_publicacao?: string | null
          detalhamento?: Json
          formato?: string | null
          horario?: string | null
          id?: string
          legenda?: string | null
          marca_id?: string | null
          ordem?: number
          organization_id?: string
          pendencia?: string | null
          pilar?: string | null
          produto_id?: string | null
          tema?: string | null
          updated_at?: string
          viabilidade?: Database["public"]["Enums"]["viabilidade_item"]
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_itens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_itens_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronogramas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_itens_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_itens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_mensagens: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          cronograma_id: string
          id: string
          itens_afetados: Json
          organization_id: string
          papel: string
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string
          cronograma_id: string
          id?: string
          itens_afetados?: Json
          organization_id: string
          papel: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          cronograma_id?: string
          id?: string
          itens_afetados?: Json
          organization_id?: string
          papel?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_mensagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_mensagens_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronogramas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_mensagens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cronogramas: {
        Row: {
          analise_coerencia: Json
          briefing: Json
          card_origem_id: string | null
          cliente_id: string
          created_at: string
          criado_por: string | null
          id: string
          marca_id: string
          mes_referencia: string
          organization_id: string
          status: Database["public"]["Enums"]["status_cronograma"]
          temas_pilares: Json
          updated_at: string
        }
        Insert: {
          analise_coerencia?: Json
          briefing?: Json
          card_origem_id?: string | null
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          id?: string
          marca_id: string
          mes_referencia: string
          organization_id: string
          status?: Database["public"]["Enums"]["status_cronograma"]
          temas_pilares?: Json
          updated_at?: string
        }
        Update: {
          analise_coerencia?: Json
          briefing?: Json
          card_origem_id?: string | null
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          marca_id?: string
          mes_referencia?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["status_cronograma"]
          temas_pilares?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronogramas_card_origem_id_fkey"
            columns: ["card_origem_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      external_share_access_log: {
        Row: {
          acessado_em: string
          arquivos_ids: string[]
          id: string
          ip_address: string | null
          link_id: string
          organization_id: string
        }
        Insert: {
          acessado_em?: string
          arquivos_ids?: string[]
          id?: string
          ip_address?: string | null
          link_id: string
          organization_id: string
        }
        Update: {
          acessado_em?: string
          arquivos_ids?: string[]
          id?: string
          ip_address?: string | null
          link_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_share_access_log_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "external_share_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_share_access_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      external_share_links: {
        Row: {
          area: Database["public"]["Enums"]["area_socia"]
          created_at: string
          criado_por: string
          descricao: string
          documentos_ids: string[]
          expira_em: string
          id: string
          organization_id: string
          revogado: boolean
          senha_hash: string | null
          token: string
        }
        Insert: {
          area: Database["public"]["Enums"]["area_socia"]
          created_at?: string
          criado_por: string
          descricao: string
          documentos_ids: string[]
          expira_em: string
          id?: string
          organization_id: string
          revogado?: boolean
          senha_hash?: string | null
          token?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_socia"]
          created_at?: string
          criado_por?: string
          descricao?: string
          documentos_ids?: string[]
          expira_em?: string
          id?: string
          organization_id?: string
          revogado?: boolean
          senha_hash?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_share_links_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_share_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_despesas: {
        Row: {
          ativo: boolean
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          ciclo: Database["public"]["Enums"]["ciclo_cobranca"] | null
          competencia: string | null
          comprovante_path: string | null
          created_at: string
          descricao: string
          fornecedor: string | null
          id: string
          observacoes: string | null
          organization_id: string
          pago_em: string | null
          recorrente: boolean
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          ciclo?: Database["public"]["Enums"]["ciclo_cobranca"] | null
          competencia?: string | null
          comprovante_path?: string | null
          created_at?: string
          descricao: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          organization_id: string
          pago_em?: string | null
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          ciclo?: Database["public"]["Enums"]["ciclo_cobranca"] | null
          competencia?: string | null
          comprovante_path?: string | null
          created_at?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          organization_id?: string
          pago_em?: string | null
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_despesas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_documentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          mes_referencia: string | null
          mime_type: string
          nome: string
          organization_id: string
          storage_path: string
          tamanho_bytes: number
          tipo: Database["public"]["Enums"]["tipo_doc_financeiro"]
          uploaded_by: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          mes_referencia?: string | null
          mime_type?: string
          nome: string
          organization_id: string
          storage_path: string
          tamanho_bytes?: number
          tipo?: Database["public"]["Enums"]["tipo_doc_financeiro"]
          uploaded_by: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          mes_referencia?: string | null
          mime_type?: string
          nome?: string
          organization_id?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo?: Database["public"]["Enums"]["tipo_doc_financeiro"]
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_documentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_historico: {
        Row: {
          competencia: string
          created_at: string
          id: string
          observacoes: string | null
          organization_id: string
          pago_em: string | null
          receita_id: string
          status: Database["public"]["Enums"]["status_pagamento"]
          valor_cobrado: number
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          observacoes?: string | null
          organization_id: string
          pago_em?: string | null
          receita_id: string
          status?: Database["public"]["Enums"]["status_pagamento"]
          valor_cobrado: number
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          organization_id?: string
          pago_em?: string | null
          receita_id?: string
          status?: Database["public"]["Enums"]["status_pagamento"]
          valor_cobrado?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_historico_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "financeiro_receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_receitas: {
        Row: {
          ativo: boolean
          ciclo: Database["public"]["Enums"]["ciclo_cobranca"]
          cliente_id: string | null
          competencia: string | null
          created_at: string
          data_cobranca_dia: number
          descricao: string
          id: string
          observacoes: string | null
          organization_id: string
          recebimento: string | null
          status: Database["public"]["Enums"]["status_pagamento"]
          ultima_atualizacao_status: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          ciclo?: Database["public"]["Enums"]["ciclo_cobranca"]
          cliente_id?: string | null
          competencia?: string | null
          created_at?: string
          data_cobranca_dia: number
          descricao: string
          id?: string
          observacoes?: string | null
          organization_id: string
          recebimento?: string | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          ultima_atualizacao_status?: string
          updated_at?: string
          valor_mensal: number
        }
        Update: {
          ativo?: boolean
          ciclo?: Database["public"]["Enums"]["ciclo_cobranca"]
          cliente_id?: string | null
          competencia?: string | null
          created_at?: string
          data_cobranca_dia?: number
          descricao?: string
          id?: string
          observacoes?: string | null
          organization_id?: string
          recebimento?: string | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          ultima_atualizacao_status?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_receitas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxo_etapas: {
        Row: {
          agente_slug: string | null
          ativo: boolean
          avanca_por: Database["public"]["Enums"]["gatilho_avanco"]
          created_at: string
          fluxo_id: string
          id: string
          kind: Database["public"]["Enums"]["kind_etapa"]
          label: string
          ordem: number
          organization_id: string
          slug: string
          status_canonico: Database["public"]["Enums"]["status_card"]
          updated_at: string
          visivel_cliente: boolean
        }
        Insert: {
          agente_slug?: string | null
          ativo?: boolean
          avanca_por?: Database["public"]["Enums"]["gatilho_avanco"]
          created_at?: string
          fluxo_id: string
          id?: string
          kind: Database["public"]["Enums"]["kind_etapa"]
          label: string
          ordem: number
          organization_id: string
          slug: string
          status_canonico: Database["public"]["Enums"]["status_card"]
          updated_at?: string
          visivel_cliente?: boolean
        }
        Update: {
          agente_slug?: string | null
          ativo?: boolean
          avanca_por?: Database["public"]["Enums"]["gatilho_avanco"]
          created_at?: string
          fluxo_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["kind_etapa"]
          label?: string
          ordem?: number
          organization_id?: string
          slug?: string
          status_canonico?: Database["public"]["Enums"]["status_card"]
          updated_at?: string
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fluxo_etapas_fluxo_id_fkey"
            columns: ["fluxo_id"]
            isOneToOne: false
            referencedRelation: "fluxos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fluxo_etapas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxos: {
        Row: {
          aprovacao_dupla: boolean
          ativo: boolean
          created_at: string
          descricao: string | null
          esforco_tipico: string
          id: string
          nome: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          aprovacao_dupla?: boolean
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          esforco_tipico?: string
          id?: string
          nome: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          aprovacao_dupla?: boolean
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          esforco_tipico?: string
          id?: string
          nome?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fluxos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          google_email: string
          id: string
          organization_id: string
          refresh_token: string
          token_expiry: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email: string
          id?: string
          organization_id: string
          refresh_token: string
          token_expiry: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string
          id?: string
          organization_id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendar_tokens_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          calculado_em: string
          cliente_id: string
          componentes: Json
          id: string
          organization_id: string
          score: number
        }
        Insert: {
          calculado_em?: string
          cliente_id: string
          componentes?: Json
          id?: string
          organization_id: string
          score: number
        }
        Update: {
          calculado_em?: string
          cliente_id?: string
          componentes?: Json
          id?: string
          organization_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      identidade_visual_ativos: {
        Row: {
          adicionado_por: string
          categoria: Database["public"]["Enums"]["tipo_ativo_visual"]
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          marca_id: string | null
          nome: string
          nota_uso: string | null
          organization_id: string
          tags: string[]
          updated_at: string
          url: string | null
          versao: number
          visivel_para_cliente: boolean
        }
        Insert: {
          adicionado_por: string
          categoria: Database["public"]["Enums"]["tipo_ativo_visual"]
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          marca_id?: string | null
          nome: string
          nota_uso?: string | null
          organization_id: string
          tags?: string[]
          updated_at?: string
          url?: string | null
          versao?: number
          visivel_para_cliente?: boolean
        }
        Update: {
          adicionado_por?: string
          categoria?: Database["public"]["Enums"]["tipo_ativo_visual"]
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          marca_id?: string | null
          nome?: string
          nota_uso?: string | null
          organization_id?: string
          tags?: string[]
          updated_at?: string
          url?: string | null
          versao?: number
          visivel_para_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "identidade_visual_ativos_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidade_visual_ativos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidade_visual_ativos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidade_visual_ativos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_acesso: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          organization_id: string
          profile_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          organization_id: string
          profile_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_acesso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_acesso_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_acesso_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_bloco_mestre: {
        Row: {
          cliente_id: string
          created_at: string
          estilo_geral: string | null
          estilo_luz: string | null
          formato_padrao: string
          id: string
          negativos_padrao: string[]
          organization_id: string
          paleta_hex: string[]
          regra_paleta: string | null
          sentimento_marca: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estilo_geral?: string | null
          estilo_luz?: string | null
          formato_padrao?: string
          id?: string
          negativos_padrao?: string[]
          organization_id: string
          paleta_hex?: string[]
          regra_paleta?: string | null
          sentimento_marca?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estilo_geral?: string | null
          estilo_luz?: string | null
          formato_padrao?: string
          id?: string
          negativos_padrao?: string[]
          organization_id?: string
          paleta_hex?: string[]
          regra_paleta?: string | null
          sentimento_marca?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_bloco_mestre_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_bloco_mestre_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_casos_calibracao: {
        Row: {
          cena_id: string | null
          cliente_id: string
          correcao_aplicada: string | null
          created_at: string
          descricao_erro: string
          dimensao_regua: string | null
          escopo_do_erro: string
          id: string
          organization_id: string
          promovido_em: string | null
          promovido_para: string | null
          promovido_por: string | null
          status: string
          updated_at: string
          vezes_visto: number
        }
        Insert: {
          cena_id?: string | null
          cliente_id: string
          correcao_aplicada?: string | null
          created_at?: string
          descricao_erro: string
          dimensao_regua?: string | null
          escopo_do_erro: string
          id?: string
          organization_id: string
          promovido_em?: string | null
          promovido_para?: string | null
          promovido_por?: string | null
          status?: string
          updated_at?: string
          vezes_visto?: number
        }
        Update: {
          cena_id?: string | null
          cliente_id?: string
          correcao_aplicada?: string | null
          created_at?: string
          descricao_erro?: string
          dimensao_regua?: string | null
          escopo_do_erro?: string
          id?: string
          organization_id?: string
          promovido_em?: string | null
          promovido_para?: string | null
          promovido_por?: string | null
          status?: string
          updated_at?: string
          vezes_visto?: number
        }
        Relationships: [
          {
            foreignKeyName: "imagens_casos_calibracao_cena_id_fkey"
            columns: ["cena_id"]
            isOneToOne: false
            referencedRelation: "imagens_cenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_casos_calibracao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_casos_calibracao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_casos_calibracao_promovido_por_fkey"
            columns: ["promovido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_categorias_variacao: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          organization_id: string
          tipo: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          organization_id: string
          tipo: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_categorias_variacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_categorias_variacao_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_cenas: {
        Row: {
          acao_pose: string
          cliente_id: string
          created_at: string
          criado_por: string | null
          ferramenta_recomendada: string | null
          formato: string | null
          id: string
          imagem_resultado_path: string | null
          negativos_final: string | null
          nota_especial: string | null
          nota_regua: string | null
          organization_id: string
          personagem_id: string | null
          personagem_texto: string | null
          produto_id: string | null
          prompt_final: string
          status: string
          updated_at: string
          variacao_atributo_id: string | null
        }
        Insert: {
          acao_pose: string
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          ferramenta_recomendada?: string | null
          formato?: string | null
          id?: string
          imagem_resultado_path?: string | null
          negativos_final?: string | null
          nota_especial?: string | null
          nota_regua?: string | null
          organization_id: string
          personagem_id?: string | null
          personagem_texto?: string | null
          produto_id?: string | null
          prompt_final: string
          status?: string
          updated_at?: string
          variacao_atributo_id?: string | null
        }
        Update: {
          acao_pose?: string
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          ferramenta_recomendada?: string | null
          formato?: string | null
          id?: string
          imagem_resultado_path?: string | null
          negativos_final?: string | null
          nota_especial?: string | null
          nota_regua?: string | null
          organization_id?: string
          personagem_id?: string | null
          personagem_texto?: string | null
          produto_id?: string | null
          prompt_final?: string
          status?: string
          updated_at?: string
          variacao_atributo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imagens_cenas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_cenas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_cenas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_cenas_personagem_id_fkey"
            columns: ["personagem_id"]
            isOneToOne: false
            referencedRelation: "imagens_personagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_cenas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "imagens_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_cenas_variacao_atributo_id_fkey"
            columns: ["variacao_atributo_id"]
            isOneToOne: false
            referencedRelation: "imagens_variacao_atributos"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_patches_tecnicos: {
        Row: {
          created_at: string
          id: string
          nome: string
          organization_id: string
          origem_caso_id: string | null
          palavras_chave: string[]
          quando_usar: string | null
          snippet_texto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          organization_id: string
          origem_caso_id?: string | null
          palavras_chave?: string[]
          quando_usar?: string | null
          snippet_texto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string
          origem_caso_id?: string | null
          palavras_chave?: string[]
          quando_usar?: string | null
          snippet_texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_patches_tecnicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_patches_tecnicos_origem_caso_id_fkey"
            columns: ["origem_caso_id"]
            isOneToOne: false
            referencedRelation: "imagens_casos_calibracao"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_personagens: {
        Row: {
          alerta_contaminacao: string | null
          cliente_id: string
          created_at: string
          descricao_fixa: string | null
          id: string
          imagem_referencia_path: string | null
          nome: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          alerta_contaminacao?: string | null
          cliente_id: string
          created_at?: string
          descricao_fixa?: string | null
          id?: string
          imagem_referencia_path?: string | null
          nome: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          alerta_contaminacao?: string | null
          cliente_id?: string
          created_at?: string
          descricao_fixa?: string | null
          id?: string
          imagem_referencia_path?: string | null
          nome?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_personagens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_personagens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_produtos: {
        Row: {
          alerta_contraste: string | null
          angulos_disponiveis: string[]
          cliente_id: string
          created_at: string
          escala_relativa: string | null
          formato: string | null
          id: string
          imagem_referencia_path: string | null
          nome: string
          organization_id: string
          regra_geracao: string | null
          restricao_conteudo: string | null
          tampa: string | null
          updated_at: string
        }
        Insert: {
          alerta_contraste?: string | null
          angulos_disponiveis?: string[]
          cliente_id: string
          created_at?: string
          escala_relativa?: string | null
          formato?: string | null
          id?: string
          imagem_referencia_path?: string | null
          nome: string
          organization_id: string
          regra_geracao?: string | null
          restricao_conteudo?: string | null
          tampa?: string | null
          updated_at?: string
        }
        Update: {
          alerta_contraste?: string | null
          angulos_disponiveis?: string[]
          cliente_id?: string
          created_at?: string
          escala_relativa?: string | null
          formato?: string | null
          id?: string
          imagem_referencia_path?: string | null
          nome?: string
          organization_id?: string
          regra_geracao?: string | null
          restricao_conteudo?: string | null
          tampa?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_produtos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_variacao_atributos: {
        Row: {
          categoria_id: string
          cliente_id: string
          created_at: string
          id: string
          organization_id: string
          status: string
          valor: string
          vezes_usado: number
        }
        Insert: {
          categoria_id: string
          cliente_id: string
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          valor: string
          vezes_usado?: number
        }
        Update: {
          categoria_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          valor?: string
          vezes_usado?: number
        }
        Relationships: [
          {
            foreignKeyName: "imagens_variacao_atributos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "imagens_categorias_variacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_variacao_atributos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_variacao_atributos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          organization_id: string
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          organization_id: string
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          organization_id?: string
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notificacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_social: {
        Row: {
          access_token: string
          ativo: boolean
          cliente_id: string | null
          created_at: string
          criado_por: string
          expires_at: string | null
          id: string
          marca_id: string | null
          organization_id: string
          page_id: string | null
          page_nome: string | null
          plataforma: Database["public"]["Enums"]["plataforma_social"]
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          criado_por: string
          expires_at?: string | null
          id?: string
          marca_id?: string | null
          organization_id: string
          page_id?: string | null
          page_nome?: string | null
          plataforma: Database["public"]["Enums"]["plataforma_social"]
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          criado_por?: string
          expires_at?: string | null
          id?: string
          marca_id?: string | null
          organization_id?: string
          page_id?: string | null
          page_nome?: string | null
          plataforma?: Database["public"]["Enums"]["plataforma_social"]
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integracao_social_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_social_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_social_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_social_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes_prospect: {
        Row: {
          created_at: string
          descricao: string
          id: string
          organization_id: string
          prospect_id: string
          registrado_por: string
          tipo: Database["public"]["Enums"]["tipo_interacao_prospect"]
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          organization_id: string
          prospect_id: string
          registrado_por: string
          tipo: Database["public"]["Enums"]["tipo_interacao_prospect"]
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          organization_id?: string
          prospect_id?: string
          registrado_por?: string
          tipo?: Database["public"]["Enums"]["tipo_interacao_prospect"]
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_prospect_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_prospect_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_prospect_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      izzi_conversas: {
        Row: {
          ativa: boolean
          atualizado_em: string
          cliente_id: string | null
          contexto_tipo: string
          criado_em: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          cliente_id?: string | null
          contexto_tipo: string
          criado_em?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          cliente_id?: string | null
          contexto_tipo?: string
          criado_em?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "izzi_conversas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "izzi_conversas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      izzi_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          criado_em: string
          id: string
          organization_id: string
          role: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          conteudo: string
          conversa_id: string
          criado_em?: string
          id?: string
          organization_id: string
          role: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          criado_em?: string
          id?: string
          organization_id?: string
          role?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "izzi_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "izzi_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "izzi_mensagens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consentimentos: {
        Row: {
          aceito: boolean
          created_at: string
          id: string
          ip_address: string | null
          organization_id: string
          profile_id: string | null
          user_agent: string | null
          user_id: string
          versao_termos: string
        }
        Insert: {
          aceito?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id: string
          profile_id?: string | null
          user_agent?: string | null
          user_id: string
          versao_termos?: string
        }
        Update: {
          aceito?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          profile_id?: string | null
          user_agent?: string | null
          user_id?: string
          versao_termos?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_consentimentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consentimentos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_encerramentos: {
        Row: {
          anonimizado_em: string | null
          carta_enviada: boolean
          cliente_id: string
          created_at: string
          id: string
          motivo: string | null
          organization_id: string
          solicitado_por: string
        }
        Insert: {
          anonimizado_em?: string | null
          carta_enviada?: boolean
          cliente_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          organization_id: string
          solicitado_por: string
        }
        Update: {
          anonimizado_em?: string | null
          carta_enviada?: boolean
          cliente_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          organization_id?: string
          solicitado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_encerramentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_encerramentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_encerramentos_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_portabilidade_requests: {
        Row: {
          cliente_id: string | null
          concluido_em: string | null
          created_at: string
          file_url: string | null
          id: string
          observacao: string | null
          organization_id: string
          solicitado_por: string
          status: string
        }
        Insert: {
          cliente_id?: string | null
          concluido_em?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          observacao?: string | null
          organization_id: string
          solicitado_por: string
          status?: string
        }
        Update: {
          cliente_id?: string | null
          concluido_em?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          observacao?: string | null
          organization_id?: string
          solicitado_por?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_portabilidade_requests_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_portabilidade_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_portabilidade_requests_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_sociais: {
        Row: {
          alcance: number
          coletado_em: string
          comentarios: number
          compartilhamentos: number
          curtidas: number
          id: string
          impressoes: number
          organization_id: string
          publicacao_id: string
          salvamentos: number
          taxa_engajamento: number | null
        }
        Insert: {
          alcance?: number
          coletado_em?: string
          comentarios?: number
          compartilhamentos?: number
          curtidas?: number
          id?: string
          impressoes?: number
          organization_id: string
          publicacao_id: string
          salvamentos?: number
          taxa_engajamento?: number | null
        }
        Update: {
          alcance?: number
          coletado_em?: string
          comentarios?: number
          compartilhamentos?: number
          curtidas?: number
          id?: string
          impressoes?: number
          organization_id?: string
          publicacao_id?: string
          salvamentos?: number
          taxa_engajamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_sociais_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metricas_sociais_publicacao_id_fkey"
            columns: ["publicacao_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_agendadas"
            referencedColumns: ["id"]
          },
        ]
      }
      moodboard_items: {
        Row: {
          adicionado_por: string
          anti_referencia: boolean
          cliente_id: string
          cor_hex: string | null
          created_at: string
          id: string
          marca_id: string | null
          nota: string | null
          ordem: number
          organization_id: string
          secao: Database["public"]["Enums"]["secao_moodboard"]
          texto: string | null
          tipo: Database["public"]["Enums"]["tipo_moodboard_item"]
          url: string | null
        }
        Insert: {
          adicionado_por: string
          anti_referencia?: boolean
          cliente_id: string
          cor_hex?: string | null
          created_at?: string
          id?: string
          marca_id?: string | null
          nota?: string | null
          ordem?: number
          organization_id: string
          secao?: Database["public"]["Enums"]["secao_moodboard"]
          texto?: string | null
          tipo: Database["public"]["Enums"]["tipo_moodboard_item"]
          url?: string | null
        }
        Update: {
          adicionado_por?: string
          anti_referencia?: boolean
          cliente_id?: string
          cor_hex?: string | null
          created_at?: string
          id?: string
          marca_id?: string | null
          nota?: string | null
          ordem?: number
          organization_id?: string
          secao?: Database["public"]["Enums"]["secao_moodboard"]
          texto?: string | null
          tipo?: Database["public"]["Enums"]["tipo_moodboard_item"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moodboard_items_adicionado_por_fkey"
            columns: ["adicionado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodboard_items_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodboard_items_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodboard_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      mrr_historico: {
        Row: {
          clientes_ativos: number
          created_at: string
          id: string
          mes: string
          mrr: number
          organization_id: string
        }
        Insert: {
          clientes_ativos?: number
          created_at?: string
          id?: string
          mes: string
          mrr?: number
          organization_id: string
        }
        Update: {
          clientes_ativos?: number
          created_at?: string
          id?: string
          mes?: string
          mrr?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mrr_historico_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          canal_email: boolean
          canal_inapp: boolean
          canal_push: boolean
          digest_diario: boolean
          evento: string
          id: string
          organization_id: string
          usuario_id: string
        }
        Insert: {
          canal_email?: boolean
          canal_inapp?: boolean
          canal_push?: boolean
          digest_diario?: boolean
          evento: string
          id?: string
          organization_id: string
          usuario_id: string
        }
        Update: {
          canal_email?: boolean
          canal_inapp?: boolean
          canal_push?: boolean
          digest_diario?: boolean
          evento?: string
          id?: string
          organization_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_clientes: {
        Row: {
          briefing_summary: string | null
          cargo_contato: string | null
          cenario_atual: string | null
          client_name: string
          cliente_id: string
          context_extra: string | null
          dores_identificadas: string | null
          email_contato: string | null
          enviado_em: string
          finished_at: string | null
          id: string
          link_enviado_em: string | null
          nome_contato: string | null
          objetivo_declarado: string | null
          organization_id: string
          servicos_contratados: Json
          setor: string | null
          status: string
          token: string
        }
        Insert: {
          briefing_summary?: string | null
          cargo_contato?: string | null
          cenario_atual?: string | null
          client_name: string
          cliente_id: string
          context_extra?: string | null
          dores_identificadas?: string | null
          email_contato?: string | null
          enviado_em?: string
          finished_at?: string | null
          id?: string
          link_enviado_em?: string | null
          nome_contato?: string | null
          objetivo_declarado?: string | null
          organization_id: string
          servicos_contratados?: Json
          setor?: string | null
          status?: string
          token?: string
        }
        Update: {
          briefing_summary?: string | null
          cargo_contato?: string | null
          cenario_atual?: string | null
          client_name?: string
          cliente_id?: string
          context_extra?: string | null
          dores_identificadas?: string | null
          email_contato?: string | null
          enviado_em?: string
          finished_at?: string | null
          id?: string
          link_enviado_em?: string | null
          nome_contato?: string | null
          objetivo_declarado?: string | null
          organization_id?: string
          servicos_contratados?: Json
          setor?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_clientes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_feedback: {
        Row: {
          clarity_score: number | null
          comment: string | null
          created_at: string
          id: string
          organization_id: string
          relevance_score: number | null
          time_score: number | null
          token: string
        }
        Insert: {
          clarity_score?: number | null
          comment?: string | null
          created_at?: string
          id?: string
          organization_id: string
          relevance_score?: number | null
          time_score?: number | null
          token: string
        }
        Update: {
          clarity_score?: number | null
          comment?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          relevance_score?: number | null
          time_score?: number | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_feedback_token_fkey"
            columns: ["token"]
            isOneToOne: true
            referencedRelation: "onboarding_clientes"
            referencedColumns: ["token"]
          },
        ]
      }
      onboarding_marcas: {
        Row: {
          briefing_output: string | null
          briefing_salvo_em: string | null
          cenario_atual: string | null
          concorrentes: string | null
          contexto_estrategico: string | null
          created_at: string
          id: string
          instagram: string | null
          linkedin: string | null
          marca_pai_id: string | null
          nivel: string
          nome: string
          notas_complementares: string | null
          ordem: number
          organization_id: string
          posicionamento_atual: string | null
          publico: string | null
          site: string | null
          status: string
          token: string
        }
        Insert: {
          briefing_output?: string | null
          briefing_salvo_em?: string | null
          cenario_atual?: string | null
          concorrentes?: string | null
          contexto_estrategico?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          marca_pai_id?: string | null
          nivel?: string
          nome: string
          notas_complementares?: string | null
          ordem?: number
          organization_id: string
          posicionamento_atual?: string | null
          publico?: string | null
          site?: string | null
          status?: string
          token: string
        }
        Update: {
          briefing_output?: string | null
          briefing_salvo_em?: string | null
          cenario_atual?: string | null
          concorrentes?: string | null
          contexto_estrategico?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          linkedin?: string | null
          marca_pai_id?: string | null
          nivel?: string
          nome?: string
          notas_complementares?: string | null
          ordem?: number
          organization_id?: string
          posicionamento_atual?: string | null
          publico?: string | null
          site?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_marcas_marca_pai_id_fkey"
            columns: ["marca_pai_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_marcas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_marcas_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "onboarding_clientes"
            referencedColumns: ["token"]
          },
        ]
      }
      onboarding_mensagens: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          role: string
          token: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_mensagens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_mensagens_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "onboarding_clientes"
            referencedColumns: ["token"]
          },
        ]
      }
      onboarding_pipeline: {
        Row: {
          ajustes: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          cliente_id: string
          created_at: string
          erro: string | null
          etapa: string
          gerado_em: string | null
          id: string
          input_manual: string | null
          marca_id: string | null
          ordem: number
          organization_id: string
          output: string | null
          run_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ajustes?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente_id: string
          created_at?: string
          erro?: string | null
          etapa: string
          gerado_em?: string | null
          id?: string
          input_manual?: string | null
          marca_id?: string | null
          ordem: number
          organization_id: string
          output?: string | null
          run_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ajustes?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente_id?: string
          created_at?: string
          erro?: string | null
          etapa?: string
          gerado_em?: string | null
          id?: string
          input_manual?: string | null
          marca_id?: string | null
          ordem?: number
          organization_id?: string
          output?: string | null
          run_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_pipeline_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_pipeline_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_pipeline_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_pipeline_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          parceiro_email: string
          parceiro_nome: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          parceiro_email: string
          parceiro_nome: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          parceiro_email?: string
          parceiro_nome?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          assistente_nome: string
          ativo: boolean
          cor_primaria: string | null
          created_at: string
          creditos_por_tipo: Json
          id: string
          limite_demandas: number | null
          logo_url: string | null
          nome: string
          plano_saas: Database["public"]["Enums"]["plano_saas"]
          slug: string
          unidade_controle: string
          updated_at: string
        }
        Insert: {
          assistente_nome?: string
          ativo?: boolean
          cor_primaria?: string | null
          created_at?: string
          creditos_por_tipo?: Json
          id?: string
          limite_demandas?: number | null
          logo_url?: string | null
          nome: string
          plano_saas?: Database["public"]["Enums"]["plano_saas"]
          slug: string
          unidade_controle?: string
          updated_at?: string
        }
        Update: {
          assistente_nome?: string
          ativo?: boolean
          cor_primaria?: string | null
          created_at?: string
          creditos_por_tipo?: Json
          id?: string
          limite_demandas?: number | null
          logo_url?: string | null
          nome?: string
          plano_saas?: Database["public"]["Enums"]["plano_saas"]
          slug?: string
          unidade_controle?: string
          updated_at?: string
        }
        Relationships: []
      }
      padroes_cliente: {
        Row: {
          cliente_id: string
          confianca: number
          exemplos: Json
          gerado_em: string
          id: string
          organization_id: string
          padrao: string
          tipo_demanda_id: string | null
        }
        Insert: {
          cliente_id: string
          confianca?: number
          exemplos?: Json
          gerado_em?: string
          id?: string
          organization_id: string
          padrao: string
          tipo_demanda_id?: string | null
        }
        Update: {
          cliente_id?: string
          confianca?: number
          exemplos?: Json
          gerado_em?: string
          id?: string
          organization_id?: string
          padrao?: string
          tipo_demanda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "padroes_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "padroes_cliente_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "padroes_cliente_tipo_demanda_id_fkey"
            columns: ["tipo_demanda_id"]
            isOneToOne: false
            referencedRelation: "tipos_demanda"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros_perfil: {
        Row: {
          cidade: string | null
          colaborador_id: string | null
          created_at: string
          dados_pessoais: Json
          dados_profissionais: Json
          datas_importantes: Json
          email: string
          estado_civil: string | null
          id: string
          nascimento: string | null
          nome: string
          onboarding_completado_em: string | null
          organization_id: string
          perfil_markdown: string | null
          token_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          colaborador_id?: string | null
          created_at?: string
          dados_pessoais?: Json
          dados_profissionais?: Json
          datas_importantes?: Json
          email: string
          estado_civil?: string | null
          id?: string
          nascimento?: string | null
          nome: string
          onboarding_completado_em?: string | null
          organization_id: string
          perfil_markdown?: string | null
          token_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          colaborador_id?: string | null
          created_at?: string
          dados_pessoais?: Json
          dados_profissionais?: Json
          datas_importantes?: Json
          email?: string
          estado_civil?: string | null
          id?: string
          nascimento?: string | null
          nome?: string
          onboarding_completado_em?: string | null
          organization_id?: string
          perfil_markdown?: string | null
          token_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parceiros_perfil_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_mapa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parceiros_perfil_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parceiros_perfil_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      pii_scan_log: {
        Row: {
          entidade: Database["public"]["Enums"]["entidade_pii"]
          entidade_id: string
          escaneado_em: string
          id: string
          organization_id: string
          tipos_pii_encontrados: string[]
        }
        Insert: {
          entidade: Database["public"]["Enums"]["entidade_pii"]
          entidade_id: string
          escaneado_em?: string
          id?: string
          organization_id: string
          tipos_pii_encontrados?: string[]
        }
        Update: {
          entidade?: Database["public"]["Enums"]["entidade_pii"]
          entidade_id?: string
          escaneado_em?: string
          id?: string
          organization_id?: string
          tipos_pii_encontrados?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "pii_scan_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_cliente: {
        Row: {
          cliente_id: string
          created_at: string
          data_inicio: string
          data_renovacao: string
          id: string
          limite_demandas_mes: number
          organization_id: string
          tipo_plano: string
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_inicio: string
          data_renovacao: string
          id?: string
          limite_demandas_mes?: number
          organization_id: string
          tipo_plano?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_inicio?: string
          data_renovacao?: string
          id?: string
          limite_demandas_mes?: number
          organization_id?: string
          tipo_plano?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_cliente_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pontuacao_mensal: {
        Row: {
          detalhes: Json
          id: string
          mes_referencia: string
          organization_id: string
          pontos: number
          usuario_id: string
        }
        Insert: {
          detalhes?: Json
          id?: string
          mes_referencia: string
          organization_id: string
          pontos?: number
          usuario_id: string
        }
        Update: {
          detalhes?: Json
          id?: string
          mes_referencia?: string
          organization_id?: string
          pontos?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontuacao_mensal_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontuacao_mensal_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string | null
          claims: Json
          cliente_id: string
          created_at: string
          id: string
          marca_id: string
          nome: string
          observacoes: string | null
          organization_id: string
          publico: string | null
          sabor: string | null
          sku: string | null
          status: Database["public"]["Enums"]["status_produto"]
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          claims?: Json
          cliente_id: string
          created_at?: string
          id?: string
          marca_id: string
          nome: string
          observacoes?: string | null
          organization_id: string
          publico?: string | null
          sabor?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["status_produto"]
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          claims?: Json
          cliente_id?: string
          created_at?: string
          id?: string
          marca_id?: string
          nome?: string
          observacoes?: string | null
          organization_id?: string
          publico?: string | null
          sabor?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["status_produto"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          id: string
          nome: string
          onboarding_concluido: boolean
          onboarding_passo: number
          organization_id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome: string
          onboarding_concluido?: boolean
          onboarding_passo?: number
          organization_id: string
          papel: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string
          onboarding_concluido?: boolean
          onboarding_passo?: number
          organization_id?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          conteudo: string
          created_at: string
          criado_por: string
          enviada: boolean
          enviada_em: string | null
          id: string
          organization_id: string
          prospect_id: string
          tokens_input: number | null
          tokens_output: number | null
          updated_at: string
          versao: number
        }
        Insert: {
          conteudo: string
          created_at?: string
          criado_por: string
          enviada?: boolean
          enviada_em?: string | null
          id?: string
          organization_id: string
          prospect_id: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          versao?: number
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por?: string
          enviada?: boolean
          enviada_em?: string | null
          id?: string
          organization_id?: string
          prospect_id?: string
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          cliente_id: string | null
          contato: Json
          created_at: string
          desconto: number | null
          empresa: string | null
          id: string
          motivo_perda: string | null
          nome: string
          organization_id: string
          origem: Database["public"]["Enums"]["origem_prospect"]
          responsavel_id: string
          segmento: string | null
          stage: Database["public"]["Enums"]["stage_prospect"]
          updated_at: string
          valor_mensal_proposto: number | null
        }
        Insert: {
          cliente_id?: string | null
          contato?: Json
          created_at?: string
          desconto?: number | null
          empresa?: string | null
          id?: string
          motivo_perda?: string | null
          nome: string
          organization_id: string
          origem?: Database["public"]["Enums"]["origem_prospect"]
          responsavel_id: string
          segmento?: string | null
          stage?: Database["public"]["Enums"]["stage_prospect"]
          updated_at?: string
          valor_mensal_proposto?: number | null
        }
        Update: {
          cliente_id?: string | null
          contato?: Json
          created_at?: string
          desconto?: number | null
          empresa?: string | null
          id?: string
          motivo_perda?: string | null
          nome?: string
          organization_id?: string
          origem?: Database["public"]["Enums"]["origem_prospect"]
          responsavel_id?: string
          segmento?: string | null
          stage?: Database["public"]["Enums"]["stage_prospect"]
          updated_at?: string
          valor_mensal_proposto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_agendadas: {
        Row: {
          card_id: string | null
          created_at: string
          criado_por: string
          data_agendada: string
          erro_mensagem: string | null
          hashtags: string | null
          id: string
          integracao_id: string | null
          legenda: string | null
          organization_id: string
          plataforma: Database["public"]["Enums"]["plataforma_social"]
          plataforma_post_id: string | null
          publicado_em: string | null
          rotulo_ia: boolean
          status: Database["public"]["Enums"]["status_publicacao"]
          storage_path: string | null
          tentativas: number
          tipo_conteudo: Database["public"]["Enums"]["tipo_conteudo_social"]
          updated_at: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          criado_por: string
          data_agendada: string
          erro_mensagem?: string | null
          hashtags?: string | null
          id?: string
          integracao_id?: string | null
          legenda?: string | null
          organization_id: string
          plataforma: Database["public"]["Enums"]["plataforma_social"]
          plataforma_post_id?: string | null
          publicado_em?: string | null
          rotulo_ia?: boolean
          status?: Database["public"]["Enums"]["status_publicacao"]
          storage_path?: string | null
          tentativas?: number
          tipo_conteudo?: Database["public"]["Enums"]["tipo_conteudo_social"]
          updated_at?: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          criado_por?: string
          data_agendada?: string
          erro_mensagem?: string | null
          hashtags?: string | null
          id?: string
          integracao_id?: string | null
          legenda?: string | null
          organization_id?: string
          plataforma?: Database["public"]["Enums"]["plataforma_social"]
          plataforma_post_id?: string | null
          publicado_em?: string | null
          rotulo_ia?: boolean
          status?: Database["public"]["Enums"]["status_publicacao"]
          storage_path?: string | null
          tentativas?: number
          tipo_conteudo?: Database["public"]["Enums"]["tipo_conteudo_social"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_agendadas_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_agendadas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_agendadas_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "integracao_social"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_agendadas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_login: {
        Row: {
          id: string
          identifier: string
          tentativa_em: string
        }
        Insert: {
          id?: string
          identifier: string
          tentativa_em?: string
        }
        Update: {
          id?: string
          identifier?: string
          tentativa_em?: string
        }
        Relationships: []
      }
      relatorios_cliente: {
        Row: {
          cliente_id: string
          conteudo: string | null
          conteudo_editado: string | null
          created_at: string
          dados: Json
          enviado_em: string | null
          id: string
          mes_referencia: string
          organization_id: string
          status: Database["public"]["Enums"]["status_relatorio"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          conteudo?: string | null
          conteudo_editado?: string | null
          created_at?: string
          dados?: Json
          enviado_em?: string | null
          id?: string
          mes_referencia: string
          organization_id: string
          status?: Database["public"]["Enums"]["status_relatorio"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          conteudo?: string | null
          conteudo_editado?: string | null
          created_at?: string
          dados?: Json
          enviado_em?: string | null
          id?: string
          mes_referencia?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["status_relatorio"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_cliente_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          arquivo_notas_url: string | null
          assunto: string | null
          audio_storage_path: string | null
          cliente_id: string | null
          confidencial: boolean
          created_at: string
          created_by: string
          data_reuniao: string
          duracao_minutos: number | null
          google_event_id: string | null
          id: string
          meet_space_id: string | null
          notas_brutas: string | null
          organization_id: string
          participantes_externos: Json
          participantes_internos: string[]
          prospect_id: string | null
          resumo_gerado: string | null
          tipo: Database["public"]["Enums"]["tipo_reuniao"]
          transcricao_bruta: string | null
          transcricao_status: string
          updated_at: string
        }
        Insert: {
          arquivo_notas_url?: string | null
          assunto?: string | null
          audio_storage_path?: string | null
          cliente_id?: string | null
          confidencial?: boolean
          created_at?: string
          created_by: string
          data_reuniao: string
          duracao_minutos?: number | null
          google_event_id?: string | null
          id?: string
          meet_space_id?: string | null
          notas_brutas?: string | null
          organization_id: string
          participantes_externos?: Json
          participantes_internos?: string[]
          prospect_id?: string | null
          resumo_gerado?: string | null
          tipo: Database["public"]["Enums"]["tipo_reuniao"]
          transcricao_bruta?: string | null
          transcricao_status?: string
          updated_at?: string
        }
        Update: {
          arquivo_notas_url?: string | null
          assunto?: string | null
          audio_storage_path?: string | null
          cliente_id?: string | null
          confidencial?: boolean
          created_at?: string
          created_by?: string
          data_reuniao?: string
          duracao_minutos?: number | null
          google_event_id?: string | null
          id?: string
          meet_space_id?: string | null
          notas_brutas?: string | null
          organization_id?: string
          participantes_externos?: Json
          participantes_internos?: string[]
          prospect_id?: string | null
          resumo_gerado?: string | null
          tipo?: Database["public"]["Enums"]["tipo_reuniao"]
          transcricao_bruta?: string | null
          transcricao_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      socias_documentos: {
        Row: {
          area: Database["public"]["Enums"]["area_socia"]
          created_at: string
          descricao: string | null
          id: string
          mes_competencia: string | null
          mime_type: string
          nome: string
          nome_arquivo: string
          organization_id: string
          tags: string[]
          tamanho_bytes: number
          uploaded_by: string
          url: string
        }
        Insert: {
          area: Database["public"]["Enums"]["area_socia"]
          created_at?: string
          descricao?: string | null
          id?: string
          mes_competencia?: string | null
          mime_type: string
          nome: string
          nome_arquivo: string
          organization_id: string
          tags?: string[]
          tamanho_bytes: number
          uploaded_by: string
          url: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_socia"]
          created_at?: string
          descricao?: string | null
          id?: string
          mes_competencia?: string | null
          mime_type?: string
          nome?: string
          nome_arquivo?: string
          organization_id?: string
          tags?: string[]
          tamanho_bytes?: number
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "socias_documentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socias_documentos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_demanda: {
        Row: {
          agente_slug: string | null
          ativo: boolean
          campos_formulario: Json
          categoria: Database["public"]["Enums"]["categoria_demanda"]
          created_at: string
          descricao: string | null
          fluxo_aprovacao_duplo: boolean
          fluxo_id: string | null
          id: string
          nome: string
          organization_id: string
          sla_ativo: boolean
          sla_prazo_inicio_horas: number | null
          sla_prazo_resposta_horas: number | null
          slug: string
          tem_publicacao: boolean
          updated_at: string
        }
        Insert: {
          agente_slug?: string | null
          ativo?: boolean
          campos_formulario?: Json
          categoria?: Database["public"]["Enums"]["categoria_demanda"]
          created_at?: string
          descricao?: string | null
          fluxo_aprovacao_duplo?: boolean
          fluxo_id?: string | null
          id?: string
          nome: string
          organization_id: string
          sla_ativo?: boolean
          sla_prazo_inicio_horas?: number | null
          sla_prazo_resposta_horas?: number | null
          slug: string
          tem_publicacao?: boolean
          updated_at?: string
        }
        Update: {
          agente_slug?: string | null
          ativo?: boolean
          campos_formulario?: Json
          categoria?: Database["public"]["Enums"]["categoria_demanda"]
          created_at?: string
          descricao?: string | null
          fluxo_aprovacao_duplo?: boolean
          fluxo_id?: string | null
          id?: string
          nome?: string
          organization_id?: string
          sla_ativo?: boolean
          sla_prazo_inicio_horas?: number | null
          sla_prazo_resposta_horas?: number | null
          slug?: string
          tem_publicacao?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_demanda_fluxo_id_fkey"
            columns: ["fluxo_id"]
            isOneToOne: false
            referencedRelation: "fluxos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_demanda_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      universo_marca: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_universo"]
          cliente_id: string
          conteudo: Json
          created_at: string
          gerado_por_agente: string | null
          id: string
          marca_id: string | null
          organization_id: string
          subcategoria: string | null
          titulo: string
          updated_at: string
          versao: number
          visivel_para_cliente: boolean
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_universo"]
          cliente_id: string
          conteudo?: Json
          created_at?: string
          gerado_por_agente?: string | null
          id?: string
          marca_id?: string | null
          organization_id: string
          subcategoria?: string | null
          titulo: string
          updated_at?: string
          versao?: number
          visivel_para_cliente?: boolean
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_universo"]
          cliente_id?: string
          conteudo?: Json
          created_at?: string
          gerado_por_agente?: string | null
          id?: string
          marca_id?: string | null
          organization_id?: string
          subcategoria?: string | null
          titulo?: string
          updated_at?: string
          versao?: number
          visivel_para_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "universo_marca_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universo_marca_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "onboarding_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "universo_marca_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_mensagens: {
        Row: {
          card_id: string | null
          conteudo_texto: string | null
          erro_detalhes: string | null
          id: string
          media_url: string | null
          mensagem_id: string | null
          nome_remetente: string | null
          numero_remetente: string
          organization_id: string
          processado_em: string | null
          recebido_em: string
          status: string
          tipo_mensagem: string
        }
        Insert: {
          card_id?: string | null
          conteudo_texto?: string | null
          erro_detalhes?: string | null
          id?: string
          media_url?: string | null
          mensagem_id?: string | null
          nome_remetente?: string | null
          numero_remetente: string
          organization_id: string
          processado_em?: string | null
          recebido_em?: string
          status?: string
          tipo_mensagem?: string
        }
        Update: {
          card_id?: string | null
          conteudo_texto?: string | null
          erro_detalhes?: string | null
          id?: string
          media_url?: string | null
          mensagem_id?: string | null
          nome_remetente?: string | null
          numero_remetente?: string
          organization_id?: string
          processado_em?: string | null
          recebido_em?: string
          status?: string
          tipo_mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_cliente_ids: { Args: never; Returns: string[] }
      auth_organization_id: { Args: never; Returns: string }
      auth_papel: {
        Args: never
        Returns: Database["public"]["Enums"]["papel_usuario"]
      }
      auth_profile_id: { Args: never; Returns: string }
      check_login_rate_limit: {
        Args: {
          p_identifier: string
          p_limit?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      imagens_tem_acesso: { Args: { p_cliente_id: string }; Returns: boolean }
      is_socia: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      area_socia:
        | "financeiro"
        | "contabilidade"
        | "juridico"
        | "rh"
        | "cultura"
        | "outros"
      categoria_demanda:
        | "redes_sociais"
        | "estrategia"
        | "embalagem"
        | "video"
        | "trafego"
        | "linkedin"
        | "email"
        | "apresentacao"
        | "relatorio"
        | "outros"
      categoria_despesa:
        | "impostos"
        | "colaboradores"
        | "ferramentas"
        | "fornecedores"
        | "marketing"
        | "escritorio"
        | "outros"
      categoria_universo:
        | "brand_system"
        | "personas"
        | "diagnostico"
        | "parametros"
        | "calendario"
        | "campanhas"
        | "outros"
      ciclo_cobranca:
        | "mensal"
        | "trimestral"
        | "semestral"
        | "anual"
        | "projeto"
      decisao_aprovacao: "aprovado" | "reprovado"
      entidade_pii: "card" | "arquivo" | "reuniao" | "proposta" | "contrato"
      gatilho_avanco:
        | "checklist"
        | "arquivo_entrega"
        | "agente_ok"
        | "cron_data_cliente"
        | "manual"
        | "nenhum"
      kind_etapa: "execucao" | "agente" | "portao_humano" | "terminal"
      origem_prospect: "indicacao" | "prospeccao_ativa" | "inbound" | "evento"
      papel_usuario: "socia" | "gestao" | "atendimento" | "executor" | "cliente"
      plano_saas: "interno" | "starter" | "pro" | "enterprise"
      plataforma_social: "instagram" | "facebook" | "linkedin" | "tiktok"
      prioridade_card: "urgente" | "alta" | "normal" | "baixa"
      regime_colaborador: "clt" | "pj" | "freelancer"
      secao_moodboard:
        | "fotografia"
        | "tipografia"
        | "cor"
        | "textura"
        | "referencia_marca"
        | "geral"
      stage_prospect:
        | "prospeccao"
        | "reuniao_agendada"
        | "reuniao_realizada"
        | "proposta_enviada"
        | "negociacao"
        | "contrato_assinado"
        | "cliente_ativo"
        | "perdido"
      status_apresentacao: "rascunho" | "publicada" | "arquivada"
      status_atividade:
        | "ideia"
        | "planejada"
        | "em_andamento"
        | "executada"
        | "cancelada"
      status_card:
        | "aguardando_info"
        | "a_fazer"
        | "em_andamento"
        | "para_aprovacao"
        | "necessita_ajustes"
        | "concluido"
        | "cancelado"
      status_cliente: "ativo" | "inativo" | "prospecto"
      status_colaborador: "ativo" | "inativo" | "em_avaliacao"
      status_cronograma: "rascunho" | "em_revisao" | "aprovado" | "desmembrado"
      status_pagamento: "pago" | "pendente" | "em_atraso"
      status_produto:
        | "ativo"
        | "nao_lancado"
        | "producao_incerta"
        | "descontinuado"
        | "fora_de_escopo"
      status_publicacao: "rascunho" | "agendado" | "publicado" | "falhou"
      status_relatorio: "gerando" | "rascunho" | "aprovado" | "enviado"
      sub_papel_contato: "responsavel" | "colaborador" | "observador"
      tipo_arquivo: "entrega" | "referencia" | "revisao"
      tipo_atividade:
        | "atividade_equipe"
        | "brinde"
        | "mimo_individual"
        | "reconhecimento"
        | "evento"
        | "celebracao"
        | "outro"
      tipo_ativo_visual:
        | "logo"
        | "paleta"
        | "tipografia"
        | "elemento_grafico"
        | "mockup"
        | "brand_guidelines"
        | "arquivo_fonte"
      tipo_badge: "colaborador" | "cliente"
      tipo_conteudo_social: "feed" | "carrossel" | "reel" | "story" | "bts"
      tipo_doc_financeiro:
        | "nota_fiscal"
        | "comprovante"
        | "contrato"
        | "boleto"
        | "outro"
      tipo_interacao_prospect:
        | "contato"
        | "nota"
        | "reuniao"
        | "objecao"
        | "proposta"
        | "contrato"
      tipo_moodboard_item: "imagem_upload" | "link_externo" | "cor" | "texto"
      tipo_notificacao:
        | "card_para_aprovacao"
        | "card_concluido"
        | "card_necessita_ajustes"
        | "prazo_proximo"
        | "prazo_vencido"
        | "plano_80_porcento"
        | "nova_avaliacao"
        | "action_item_pendente"
        | "geral"
        | "publicacao_falhou"
      tipo_reuniao: "prospeccao" | "cliente" | "interna" | "onboarding"
      tipo_slide:
        | "capa"
        | "titulo_secao"
        | "texto"
        | "imagem"
        | "texto_imagem"
        | "metricas"
        | "citacao"
      viabilidade_item:
        | "proposta"
        | "roteiro_a_fechar"
        | "so_ia"
        | "depende_registro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      area_socia: [
        "financeiro",
        "contabilidade",
        "juridico",
        "rh",
        "cultura",
        "outros",
      ],
      categoria_demanda: [
        "redes_sociais",
        "estrategia",
        "embalagem",
        "video",
        "trafego",
        "linkedin",
        "email",
        "apresentacao",
        "relatorio",
        "outros",
      ],
      categoria_despesa: [
        "impostos",
        "colaboradores",
        "ferramentas",
        "fornecedores",
        "marketing",
        "escritorio",
        "outros",
      ],
      categoria_universo: [
        "brand_system",
        "personas",
        "diagnostico",
        "parametros",
        "calendario",
        "campanhas",
        "outros",
      ],
      ciclo_cobranca: ["mensal", "trimestral", "semestral", "anual", "projeto"],
      decisao_aprovacao: ["aprovado", "reprovado"],
      entidade_pii: ["card", "arquivo", "reuniao", "proposta", "contrato"],
      gatilho_avanco: [
        "checklist",
        "arquivo_entrega",
        "agente_ok",
        "cron_data_cliente",
        "manual",
        "nenhum",
      ],
      kind_etapa: ["execucao", "agente", "portao_humano", "terminal"],
      origem_prospect: ["indicacao", "prospeccao_ativa", "inbound", "evento"],
      papel_usuario: ["socia", "gestao", "atendimento", "executor", "cliente"],
      plano_saas: ["interno", "starter", "pro", "enterprise"],
      plataforma_social: ["instagram", "facebook", "linkedin", "tiktok"],
      prioridade_card: ["urgente", "alta", "normal", "baixa"],
      regime_colaborador: ["clt", "pj", "freelancer"],
      secao_moodboard: [
        "fotografia",
        "tipografia",
        "cor",
        "textura",
        "referencia_marca",
        "geral",
      ],
      stage_prospect: [
        "prospeccao",
        "reuniao_agendada",
        "reuniao_realizada",
        "proposta_enviada",
        "negociacao",
        "contrato_assinado",
        "cliente_ativo",
        "perdido",
      ],
      status_apresentacao: ["rascunho", "publicada", "arquivada"],
      status_atividade: [
        "ideia",
        "planejada",
        "em_andamento",
        "executada",
        "cancelada",
      ],
      status_card: [
        "aguardando_info",
        "a_fazer",
        "em_andamento",
        "para_aprovacao",
        "necessita_ajustes",
        "concluido",
        "cancelado",
      ],
      status_cliente: ["ativo", "inativo", "prospecto"],
      status_colaborador: ["ativo", "inativo", "em_avaliacao"],
      status_cronograma: ["rascunho", "em_revisao", "aprovado", "desmembrado"],
      status_pagamento: ["pago", "pendente", "em_atraso"],
      status_produto: [
        "ativo",
        "nao_lancado",
        "producao_incerta",
        "descontinuado",
        "fora_de_escopo",
      ],
      status_publicacao: ["rascunho", "agendado", "publicado", "falhou"],
      status_relatorio: ["gerando", "rascunho", "aprovado", "enviado"],
      sub_papel_contato: ["responsavel", "colaborador", "observador"],
      tipo_arquivo: ["entrega", "referencia", "revisao"],
      tipo_atividade: [
        "atividade_equipe",
        "brinde",
        "mimo_individual",
        "reconhecimento",
        "evento",
        "celebracao",
        "outro",
      ],
      tipo_ativo_visual: [
        "logo",
        "paleta",
        "tipografia",
        "elemento_grafico",
        "mockup",
        "brand_guidelines",
        "arquivo_fonte",
      ],
      tipo_badge: ["colaborador", "cliente"],
      tipo_conteudo_social: ["feed", "carrossel", "reel", "story", "bts"],
      tipo_doc_financeiro: [
        "nota_fiscal",
        "comprovante",
        "contrato",
        "boleto",
        "outro",
      ],
      tipo_interacao_prospect: [
        "contato",
        "nota",
        "reuniao",
        "objecao",
        "proposta",
        "contrato",
      ],
      tipo_moodboard_item: ["imagem_upload", "link_externo", "cor", "texto"],
      tipo_notificacao: [
        "card_para_aprovacao",
        "card_concluido",
        "card_necessita_ajustes",
        "prazo_proximo",
        "prazo_vencido",
        "plano_80_porcento",
        "nova_avaliacao",
        "action_item_pendente",
        "geral",
        "publicacao_falhou",
      ],
      tipo_reuniao: ["prospeccao", "cliente", "interna", "onboarding"],
      tipo_slide: [
        "capa",
        "titulo_secao",
        "texto",
        "imagem",
        "texto_imagem",
        "metricas",
        "citacao",
      ],
      viabilidade_item: [
        "proposta",
        "roteiro_a_fechar",
        "so_ia",
        "depende_registro",
      ],
    },
  },
} as const
