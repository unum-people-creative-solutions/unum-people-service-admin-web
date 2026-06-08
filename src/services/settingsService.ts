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
  updated_at: string;
}

export interface GlobalSettingsResponse {
  settings: GlobalSettings;
  dns: DNSStatus;
}

export const settingsService = {
  getSettings: async (): Promise<GlobalSettingsResponse> => {
    return api.get('/admin/settings');
  },

  updateSettings: async (data: { institutional_email: string; redirection_email: string }): Promise<void> => {
    await api.post('/admin/settings', data);
  },
};
