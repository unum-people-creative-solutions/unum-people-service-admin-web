import { api } from '@/lib/api';

// Feature flags (modo-teste-fase3, TECH-DESIGN §7): estado gravado no banco e
// gerido só pelo operador. Contrato idêntico ao de flags_handler.go (Admin).
export type FlagEstado = 'desligada' | 'teste' | 'ligada';

export interface FlagVisao {
  chave: string;
  descricao: string;
  apps: string[];
  estado: FlagEstado;
  atualizado_em?: string;
  atualizado_por?: string;
}

export const flagsService = {
  listar: async (): Promise<FlagVisao[]> => {
    const resposta = await api.get<{ flags: FlagVisao[] }>('/admin/flags');
    return resposta.flags;
  },

  atualizar: async (chave: string, estado: FlagEstado): Promise<FlagVisao> => {
    return api.put<FlagVisao>(`/admin/flags/${encodeURIComponent(chave)}`, { estado });
  },
};
