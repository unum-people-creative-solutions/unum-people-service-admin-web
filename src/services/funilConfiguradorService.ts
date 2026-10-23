import { api } from '@/lib/api';

export interface FunilConfigurador {
  tenant_real: string;
  tenant_real_nome: string;
  tenant_teste: string;
  tenant_teste_nome: string;
}

export const funilConfiguradorService = {
  obter: async (): Promise<FunilConfigurador> => api.get('/admin/settings/funil-configurador'),
  atualizar: async (real: string, teste: string): Promise<FunilConfigurador> =>
    api.put('/admin/settings/funil-configurador', { tenant_real: real, tenant_teste: teste }),
};
