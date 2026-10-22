import { api } from '@/lib/api';

export interface GoogleAdsMaster {
  conectado: boolean;
  email: string;
  conectado_em: string;
  mcc_customer_id: string;
  tenants_usando: number;
}

export const googleAdsService = {
  obter: async (): Promise<GoogleAdsMaster> => api.get('/admin/settings/google-ads'),
  atualizarMcc: async (mcc: string): Promise<GoogleAdsMaster> =>
    api.put('/admin/settings/google-ads', { mcc_customer_id: mcc }),
};
