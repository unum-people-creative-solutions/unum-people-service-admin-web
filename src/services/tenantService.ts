import { useAuthStore } from "@/store/useAuthStore";
import { Tenant, CreateTenantInput } from "@/types/tenant";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const { token } = useAuthStore.getState();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

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

  resetPassword: (id: string): Promise<{ message: string }> => fetchWithAuth(`/admin/tenants/${id}/reset-password`, {
    method: 'POST',
  }),

  getStats: (): Promise<any> => fetchWithAuth('/admin/dashboard/stats'),
  
  getLogs: (): Promise<any[]> => fetchWithAuth('/admin/dashboard/logs'),
};
