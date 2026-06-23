export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  tipo: "receita" | "despesa";
  cor: string;
  created_at: string;
}

export type StatusTransacao = "confirmada" | "pendente";

export interface Transacao {
  id: string;
  user_id: string;
  categoria_id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  status: StatusTransacao;
  created_at: string;
  categoria_nome?: string;
  categoria_cor?: string;
}

export interface TransacaoFormData {
  tipo: "receita" | "despesa";
  categoria_id: string;
  descricao: string;
  valor: string;
  data: string;
  status?: StatusTransacao;
}

export interface Recorrente {
  id: string;
  user_id: string;
  categoria_id: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  dia_vencimento: number;
  ativo: boolean;
  created_at: string;
  categoria_nome?: string;
  categoria_cor?: string;
}

export interface Auditoria {
  id: string;
  user_id: string;
  transacao_id: string | null;
  acao: "alteracao" | "exclusao";
  justificativa: string;
  dados_anteriores: Record<string, any> | null;
  dados_novos: Record<string, any> | null;
  created_at: string;
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
}

export interface DashboardData {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  despesasPorCategoria: { nome: string; cor: string; valor: number }[];
  topCategorias: { nome: string; cor: string; valor: number }[];
  comparativoMensal: { mes: string; receitas: number; despesas: number }[];
}
