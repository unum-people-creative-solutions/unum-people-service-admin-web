import { CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js';
import { useAuthStore } from "@/store/useAuthStore";
import { userPool } from "@/lib/cognito";
import { Tenant, CreateTenantInput } from "@/types/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';

async function refreshAccessToken(): Promise<string | null> {
  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) return null;

  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({ Username: user.email, Pool: userPool });

    cognitoUser.refreshSession(
      new CognitoRefreshToken({ RefreshToken: refreshToken }),
      (err, session) => {
        if (err || !session) {
          resolve(null);
          return;
        }
        const newToken = session.getIdToken().getJwtToken();
        useAuthStore.getState().setToken(newToken);
        resolve(newToken);
      }
    );
  });
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<any> {
  const { token } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Automatic token refresh on 401 — then retry once
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });
    }

    // Se após a tentativa de refresh (ou falha dele) continuar 401, força logout
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const tenantService = {
  list: (): Promise<Tenant[]> => fetchWithAuth('/admin/tenants'),
  
  getById: (id: string): Promise<Tenant> => fetchWithAuth(`/admin/tenants/${id}`),
  
  create: (data: CreateTenantInput): Promise<Tenant> => fetchWithAuth('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: Partial<Tenant>): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: string, immediate: boolean): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${id}${immediate ? '?immediate=true' : ''}`, {
    method: 'DELETE',
  }),

  resetPassword: (id: string): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${id}/reset-password`, {
    method: 'POST',
  }),

  getStats: (): Promise<any> => fetchWithAuth('/admin/dashboard/stats'),
  
  getLogs: (filters?: { type?: string; service?: string; start?: string; end?: string }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.service) params.append('service', filters.service);
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    
    const queryString = params.toString();
    return fetchWithAuth(`/admin/dashboard/logs${queryString ? `?${queryString}` : ''}`);
  },

  getSystemErrors: (filters?: { service?: string; start?: string }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.service) params.append('service', filters.service);
    if (filters?.start) params.append('start', filters.start);
    
    const queryString = params.toString();
    return fetchWithAuth(`/admin/dashboard/errors${queryString ? `?${queryString}` : ''}`);
  },
};
