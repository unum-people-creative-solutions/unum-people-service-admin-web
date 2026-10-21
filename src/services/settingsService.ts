import { api } from '@/lib/api';

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
}

export interface DNSStatus {
  domain: string;
  status: string;
  records: DNSRecord[];
}

export interface GlobalSettings {
  institutional_email: string;
  redirection_email: string;
  vapid_email: string;
  operator_email: string;
  updated_at: string;
}

export interface GlobalSettingsResponse {
  settings: GlobalSettings;
  dns: DNSStatus;
}

// Token do modo teste do checkout (modo-teste-fase2, TECH-DESIGN §6.3).
export interface ModoTesteEstado {
  ativo: boolean;
  token?: string;
  rotacionado_em?: string;
  rotacionado_por?: string;
}

export const settingsService = {
  getSettings: async (): Promise<GlobalSettingsResponse> => {
    return api.get('/admin/settings');
  },

  updateSettings: async (data: { institutional_email: string; redirection_email: string; vapid_email: string; operator_email: string }): Promise<void> => {
    await api.post('/admin/settings', data);
  },

  obterModoTeste: async (): Promise<ModoTesteEstado> => {
    return api.get('/admin/settings/test-mode');
  },

  rotacionarModoTeste: async (): Promise<{ token: string; rotacionado_em: string }> => {
    return api.post('/admin/settings/test-mode/rotate');
  },

  desligarModoTeste: async (): Promise<void> => {
    await api.delete('/admin/settings/test-mode');
  },
};
