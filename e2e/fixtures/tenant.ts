import type { Page } from '@playwright/test';

/**
 * Fixtures e helpers compartilhados pelos specs de E2E do Card de Billing /
 * ações de tenant.
 *
 * Este app não tem backend mockável localmente (API Gateway + Lambda reais,
 * autenticação via Cognito real). Por isso:
 *  - A sessão autenticada é simulada escrevendo diretamente a chave usada
 *    pelo `zustand/persist` em `src/store/useAuthStore.ts`
 *    (`admin-auth-storage`), evitando depender do Cognito real.
 *  - As chamadas a `/admin/tenants/**` são interceptadas via `page.route`,
 *    evitando depender do backend Go/Lambda real.
 */

/**
 * Mesma resolução de URL usada por `src/lib/api.ts` e
 * `src/services/tenantService.ts` (`NEXT_PUBLIC_API_URL`, com o mesmo
 * fallback). Lida em tempo de execução do Playwright (Node), via `.env`
 * deste repo, para que as rotas interceptadas casem com a URL real para a
 * qual o app vai disparar `fetch`.
 */
export const FAKE_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';

export const AUTH_STORAGE_KEY = 'admin-auth-storage';

export type TenantStatus =
  | 'aguardando_ativacao'
  | 'ativo'
  | 'inadimplente'
  | 'suspenso'
  | 'pausado'
  | 'cancelado'
  | 'pendente_asaas';

export interface MockContract {
  plan_id: string;
  plan_type: 'pago' | 'personalizado' | 'livre';
  activation_fee: number;
  monthly_value: number;
  activation_invoice_url?: string;
  subscription_invoice_url?: string;
  subscription_url_state?: 'aguardando_ativacao' | 'gerando' | 'disponivel' | 'erro';
  created_at: string;
}

export interface MockTenant {
  id: string;
  api_key: string;
  nome_negocio: string;
  email_contato: string;
  documento: string;
  nicho: string;
  use_mcc_auth: boolean;
  status: TenantStatus;
  plan_id: string;
  plan_type?: 'pago' | 'personalizado' | 'livre';
  plan_value: number;
  plan_cycle: 'mensal' | 'anual';
  activated_at: string;
  next_billing_at: string;
  renewal_at: string;
  is_blocked: boolean;
  created_at: string;
  contract?: MockContract;
}

export const TENANT_ID = 't-e2e-123';

export function buildTenant(overrides: Partial<MockTenant> = {}): MockTenant {
  return {
    id: TENANT_ID,
    api_key: 'up_e2e_fake_key_0000000000',
    nome_negocio: 'Clínica E2E de Testes',
    email_contato: 'contato@e2e-tests.dev',
    documento: '00000000000',
    nicho: 'SAUDE',
    use_mcc_auth: false,
    status: 'ativo',
    plan_id: 'lp_basico',
    plan_type: 'pago',
    plan_value: 199,
    plan_cycle: 'mensal',
    activated_at: new Date().toISOString(),
    next_billing_at: new Date().toISOString(),
    renewal_at: new Date().toISOString(),
    is_blocked: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Injeta um estado "autenticado como admin" no localStorage, no mesmo
 * formato persistido pelo useAuthStore (zustand/persist), antes de qualquer
 * script da página rodar. Evita depender do fluxo real do Cognito.
 */
export async function mockAuthenticatedSession(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: AUTH_STORAGE_KEY,
      value: JSON.stringify({
        state: {
          user: { email: 'admin-e2e@unumpeople.com', groups: ['GlobalAdmin'] },
          token: 'fake-e2e-jwt-token',
          refreshToken: 'fake-e2e-refresh-token',
          isAuthenticated: true,
          isAdmin: true,
        },
        version: 0,
      }),
    }
  );
}

/**
 * Intercepta as chamadas de API relativas a um tenant específico
 * (GET /admin/tenants/:id, listagem de usuários, planos, e as ações de
 * billing) e responde com dados controlados pelo teste, sem bater no
 * backend real.
 */
export async function mockTenantApi(
  page: Page,
  options: {
    tenant: MockTenant;
    onReactivate?: () => Promise<{ status?: number; body?: unknown }> | { status?: number; body?: unknown };
    onCancel?: () => Promise<{ status?: number; body?: unknown }> | { status?: number; body?: unknown };
    onPause?: () => Promise<{ status?: number; body?: unknown }> | { status?: number; body?: unknown };
  }
) {
  const { tenant, onReactivate, onCancel, onPause } = options;

  // Permite ler o tenant "atual" (mutável) entre chamadas, para refletir
  // efeitos colaterais simulados (ex: reativação muda o status).
  let currentTenant: MockTenant = { ...tenant };

  await page.route(`${FAKE_API_BASE}/admin/tenants/${tenant.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentTenant) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });

  await page.route(`${FAKE_API_BASE}/admin/tenants/${tenant.id}/users`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route(`${FAKE_API_BASE}/admin/plans`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ active: [], inactive: [] }),
    });
  });

  await page.route(`${FAKE_API_BASE}/admin/tenants/${tenant.id}/reactivate`, async (route) => {
    const result = onReactivate ? await onReactivate() : { status: 200, body: { message: 'ok' } };
    if ((result.status ?? 200) < 400) {
      currentTenant = { ...currentTenant, status: 'ativo' };
    }
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body ?? { message: 'ok' }),
    });
  });

  await page.route(`${FAKE_API_BASE}/admin/tenants/${tenant.id}/cancel`, async (route) => {
    const result = onCancel ? await onCancel() : { status: 200, body: { message: 'ok' } };
    if ((result.status ?? 200) < 400) {
      currentTenant = { ...currentTenant, status: 'cancelado' };
    }
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body ?? { message: 'ok' }),
    });
  });

  await page.route(`${FAKE_API_BASE}/admin/tenants/${tenant.id}/pause`, async (route) => {
    const result = onPause ? await onPause() : { status: 200, body: { message: 'ok' } };
    if ((result.status ?? 200) < 400) {
      currentTenant = { ...currentTenant, status: 'pausado' };
    }
    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body ?? { message: 'ok' }),
    });
  });

  return {
    getCurrentTenant: () => currentTenant,
  };
}
