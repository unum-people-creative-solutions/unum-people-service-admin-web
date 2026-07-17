import { CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js';
import { useAuthStore } from "@/store/useAuthStore";
import { userPool } from "@/lib/cognito";
import { Tenant, CreateTenantInput, TenantUser, TenantUserRole, AddTenantUserInput, ChangePlanInput, Invoice } from "@/types/tenant";

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

  // 204 No Content (DELETE) ou 201/200 sem corpo: response.json() em string vazia
  // lança "Unexpected end of JSON input". Só faz parse se houver conteúdo.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const tenantService = {
  list: (): Promise<Tenant[]> => fetchWithAuth('/admin/tenants'),
  
  getById: (id: string): Promise<Tenant> => fetchWithAuth(`/admin/tenants/${id}`),
  
  create: (data: CreateTenantInput): Promise<Tenant> => fetchWithAuth('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  changePlan: (tenantId: string, input: ChangePlanInput): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${tenantId}/plan`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),

  updateBillingMethod: (tenantId: string, subscriptionBillingType: string): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${tenantId}/billing-method`, {
    method: 'POST',
    body: JSON.stringify({ subscription_billing_type: subscriptionBillingType }),
  }),

  update: (id: string, data: Partial<Tenant>): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: string, immediate: boolean): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${id}${immediate ? '?immediate=true' : ''}`, {
    method: 'DELETE',
  }),

  resetUserPassword: (tenantId: string, email: string): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${tenantId}/users/${email}/reset-password`, {
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

  listUsers: (tenantId: string): Promise<TenantUser[]> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/users`, { method: 'GET' }),

  addUser: (tenantId: string, data: AddTenantUserInput): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeUser: (tenantId: string, email: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/users/${email}`, {
      method: 'DELETE',
    }),

  updateUserRole: (tenantId: string, email: string, role: TenantUserRole): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/users/${email}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  blockUser: (tenantId: string, email: string, isBlocked: boolean): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/users/${email}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ is_blocked: isBlocked }),
    }),

  updateUserName: (tenantId: string, email: string, name: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/users/${email}/name`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  retryBilling: (tenantId: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/subscription/retry`, {
      method: 'POST',
    }),

  retryActivation: (tenantId: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/activation/retry`, {
      method: 'POST',
    }),

  reactivateTenant: (tenantId: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/reactivate`, {
      method: 'POST',
    }),

  pauseSubscription: (id: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${id}/pause`, {
      method: 'POST',
    }),

  cancelContract: (id: string): Promise<{ message: string }> =>
    fetchWithAuth(`/admin/tenants/${id}/cancel`, {
      method: 'POST',
    }),

  listInvoices: (tenantId: string): Promise<Invoice[]> =>
    fetchWithAuth(`/admin/tenants/${tenantId}/invoices`, { method: 'GET' }),
};
