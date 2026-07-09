import fs from 'node:fs';
import path from 'node:path';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';
const STORAGE_STATE_PATH = path.join(__dirname, '../.auth/admin.json');

function getToken(): string {
  const raw = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
  const entries: { name: string; value: string }[] = raw.origins?.[0]?.localStorage ?? [];
  const entry = entries.find(e => e.name === 'admin-auth-storage');
  if (!entry) throw new Error('auth token não encontrado no storageState');
  const authState = JSON.parse(entry.value);
  return authState.state.token as string;
}

async function apiCall<T = unknown>(method: string, urlPath: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${urlPath} → ${res.status}: ${text}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function getTenant(id: string) {
  return apiCall<{ id: string; status: string }>('GET', `/admin/tenants/${id}`);
}

export async function cancelTenant(id: string) {
  return apiCall('POST', `/admin/tenants/${id}/cancel`);
}

export async function deleteTenant(id: string) {
  return apiCall('DELETE', `/admin/tenants/${id}?immediate=true`);
}

export async function listPlans() {
  return apiCall<{ active: { slug: string; nome: string; activation_fee: number; monthly_value: number }[]; inactive: any[] }>('GET', '/admin/plans');
}
