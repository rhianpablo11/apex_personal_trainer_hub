export interface Student {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  horario: string; // e.g. "08:00"
  vencimento_dia: number; // e.g. 5, 10, 15, 20, 25, 30
  data_contratacao: string; // e.g. "2026-06-01"
  pago_este_mes: boolean;
  whatsapp: string;
  forma_pagamento: string; // e.g. "Pix", "Cartão", "Dinheiro", "Transferência"
  treino: string; // observations, training type or description
  ativo: boolean; // CRUD delete: inactive
  data_hora_treino?: string; // scheduled next training time (ISO string)
  valor_mensalidade?: number; // monthly fee amount (optional)
}

export interface Payment {
  id: string;
  student_id: string;
  nome_aluno: string;
  mes_referencia: string; // e.g. "2026-07"
  data_pagamento: string; // e.g. "2026-07-02"
  valor: number;
  forma_pagamento: string;
  status: 'Pago' | 'Pendente';
}

export interface SyncState {
  lastSynced: string | null; // ISO string
  syncing: boolean;
  conflict: boolean;
  conflictData: {
    local: Student[];
    remote: Student[];
    localPayments: Payment[];
    remotePayments: Payment[];
    remoteModifiedTime: string;
  } | null;
}

export type ThemeMode = 'light' | 'dark' | 'system';
