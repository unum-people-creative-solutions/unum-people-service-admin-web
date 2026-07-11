import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { cancelTenant, deleteTenant } from './helpers/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'admin.json');
const ts = Date.now();

async function getAuthToken(): Promise<string> {
  const raw = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
  const entries: Array<{ name: string; value: string }> = raw.origins?.[0]?.localStorage ?? [];
  const entry = entries.find((e) => e.name === 'admin-auth-storage');
  if (!entry) throw new Error('admin-auth-storage não encontrado no storageState');
  return (JSON.parse(entry.value) as { state: { token: string } }).state.token;
}

async function apiCall<T = unknown>(method: string, urlPath: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${urlPath} → ${res.status}: ${text}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function createLivreComDocumentoViaApi(seed: number): Promise<string> {
  const data = await apiCall<{ id: string }>('POST', '/admin/tenants', {
    nome_negocio: `E2E ChangePlan ${seed}`,
    nome_admin: `Admin CP ${seed}`,
    email_contato: `e2e+cp+${seed}@e2e-tests.dev`,
    nicho: 'TECNOLOGIA',
    plan_id: 'livre',
    plan_type: 'livre',
    plan_value: 0,
    plan_cycle: 'mensal',
    activation_fee: 0,
    monthly_value: 0,
    enabled_services: ['site'],
    temporary_password: 'Unum@123456',
    is_test_tenant: true,
    documento: '123.456.789-09',
  });
  return data.id;
}

async function createPersonalizadoViaApi(
  seed: number,
  cycle: 'mensal' | 'anual',
): Promise<{ id: string; activation_invoice_url: string }> {
  const data = await apiCall<{ id: string; contract?: { activation_invoice_url?: string } }>(
    'POST',
    '/admin/tenants',
    {
      nome_negocio: `E2E Pago CP ${seed} ${cycle}`,
      nome_admin: `Admin Pago ${seed}`,
      email_contato: `e2e+pago+${seed}+${cycle}@e2e-tests.dev`,
      nicho: 'TECNOLOGIA',
      plan_id: 'personalizado',
      plan_type: 'personalizado',
      plan_value: cycle === 'mensal' ? 9990 : 24000,
      plan_cycle: cycle,
      activation_fee: 24000,
      monthly_value: cycle === 'mensal' ? 9990 : 0,
      activation_billing_type: 'credit_card',
      subscription_billing_type: cycle === 'mensal' ? 'credit_card' : 'credit_card',
      enabled_services: ['site'],
      temporary_password: 'Unum@123456',
      is_test_tenant: true,
      documento: '123.456.789-09',
    },
  );
  return { id: data.id, activation_invoice_url: data.contract?.activation_invoice_url ?? '' };
}


async function waitForActivationUrl(tenantId: string, timeoutMs = 30_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await apiCall<{ contract?: { activation_invoice_url?: string; subscription_invoice_url?: string } }>('GET', `/admin/tenants/${tenantId}`);
    const url = data.contract?.activation_invoice_url || data.contract?.subscription_invoice_url || '';
    if (url) return url;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`activation_invoice_url/subscription_invoice_url não disponível após ${timeoutMs}ms para tenant ${tenantId}`);
}

async function getTenantStatus(tenantId: string): Promise<string> {
  const data = await apiCall<{ status: string }>('GET', `/admin/tenants/${tenantId}`);
  return data.status;
}

async function waitForAtivo(tenantId: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getTenantStatus(tenantId);
    if (status.toLowerCase() === 'ativo') return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Tenant ${tenantId} não ficou ATIVO em ${timeoutMs}ms`);
}

async function aguardarPagamentoManual(invoiceUrl: string, tenantId: string): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('PAGAMENTO NECESSARIO — acesse o link abaixo e complete o pagamento:');
  console.log(invoiceUrl);
  console.log(`Aguardando tenant ${tenantId} ficar ATIVO (timeout: 5 min)...`);
  console.log('='.repeat(70) + '\n');
  await waitForAtivo(tenantId, 300_000);
  console.log(`\nTenant ${tenantId} ficou ATIVO. Continuando o teste...\n`);
}

async function changePlanViaUI(
  page: import('@playwright/test').Page,
  tenantId: string,
  newPlanSlug: string,
): Promise<void> {
  await page.goto(`/tenants/${tenantId}`);
  await page.waitForLoadState('networkidle');

  await page.locator('#plan_id').selectOption(newPlanSlug);
  await page.waitForTimeout(500);

  await Promise.all([
    page.waitForSelector('h3:has-text("Confirmar Troca de Plano")', { timeout: 15_000 }),
    page.getByRole('button', { name: /salvar alterações/i }).click(),
  ]);

  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/admin/tenants/${tenantId}/plan`) && r.request().method() === 'POST',
      { timeout: 30_000 },
    ),
    page.getByRole('button', { name: /confirmar troca/i }).click(),
  ]);
}

async function listActivePlans(): Promise<
  Array<{ slug: string; nome: string; cycle: string; activation_fee: number; monthly_value: number }>
> {
  const data = await apiCall<{ active: any[]; inactive: any[] }>('GET', '/admin/plans');
  return data.active ?? [];
}

test.describe('Livre → Pago mensal', () => {
  test.setTimeout(90_000);
  let tenantId: string;
  let mensalPlanSlug: string;

  test.beforeAll(async () => {
    const plans = await listActivePlans();
    const mensalPlan = plans.find((p) => p.cycle === 'mensal' && p.slug !== 'livre');
    if (!mensalPlan) {
      return;
    }
    mensalPlanSlug = mensalPlan.slug;
    tenantId = await createLivreComDocumentoViaApi(ts);
  });

  test.afterAll(async () => {
    if (tenantId) {
      try {
        await cancelTenant(tenantId);
      } catch {}
      try {
        await deleteTenant(tenantId);
      } catch {}
    }
  });

  test('troca plano livre para pago mensal e exibe billing card', async ({ page }) => {
    const plans = await listActivePlans();
    const mensalPlan = plans.find((p) => p.cycle === 'mensal' && p.slug !== 'livre');
    if (!mensalPlan || !tenantId) {
      test.skip(true, 'Nenhum plano mensal pago ativo ou tenant não criado — teste ignorado');
      return;
    }

    await changePlanViaUI(page, tenantId, mensalPlanSlug);

    await page.goto(`/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="billing-card"]')).toBeVisible({ timeout: 15_000 });
    // O backend pode demorar para gerar o activation_invoice_url; verifica
    // pelo menos que o BillingCard foi montado com informações de faturamento.
    // Se a URL estiver disponível, o link aparece; caso contrário, o status
    // "Aguardando ativação" indica que o contrato foi criado com sucesso.
    const billingCard = page.locator('[data-testid="billing-card"]');
    const hasActivationLink = await billingCard.getByRole('link', { name: /link de ativação/i }).isVisible({ timeout: 3_000 }).catch(() => false);
    const hasAwaitingText = await billingCard.getByText(/aguardando.*ativação|link de ativação/i).isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasActivationLink || hasAwaitingText, 'BillingCard deve mostrar link de ativação ou status aguardando ativação').toBe(true);
  });
});

test.describe('Livre → Pago anual', () => {
  test.setTimeout(90_000);
  let tenantId: string;
  let anualPlanSlug: string;

  test.beforeAll(async () => {
    const plans = await listActivePlans();
    const anualPlan = plans.find((p) => p.cycle === 'anual');
    if (!anualPlan) {
      return;
    }
    anualPlanSlug = anualPlan.slug;
    tenantId = await createLivreComDocumentoViaApi(ts + 1);
  });

  test.afterAll(async () => {
    if (tenantId) {
      try {
        await cancelTenant(tenantId);
      } catch {}
      try {
        await deleteTenant(tenantId);
      } catch {}
    }
  });

  test('troca plano livre para pago anual e exibe billing card', async ({ page }) => {
    const plans = await listActivePlans();
    const anualPlan = plans.find((p) => p.cycle === 'anual');
    if (!anualPlan || !tenantId) {
      test.skip(true, 'Nenhum plano anual ativo ou tenant não criado — teste ignorado');
      return;
    }

    await changePlanViaUI(page, tenantId, anualPlanSlug);

    await page.goto(`/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="billing-card"]')).toBeVisible({ timeout: 15_000 });
    // O backend pode demorar para gerar o activation_invoice_url; verifica
    // pelo menos que o BillingCard foi montado com informações de faturamento.
    const billingCard = page.locator('[data-testid="billing-card"]');
    const hasActivationLink = await billingCard.getByRole('link', { name: /link de ativação/i }).isVisible({ timeout: 3_000 }).catch(() => false);
    const hasAwaitingText = await billingCard.getByText(/aguardando.*ativação|link de ativação/i).isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasActivationLink || hasAwaitingText, 'BillingCard deve mostrar link de ativação ou status aguardando ativação').toBe(true);
  });
});

test.describe('Pago mensal → Pago mensal (plano diferente)', () => {
  test.setTimeout(360_000);
  let tenantId: string;

  test.afterAll(async () => {
    if (tenantId) {
      try {
        await cancelTenant(tenantId);
      } catch {}
      try {
        await deleteTenant(tenantId);
      } catch {}
    }
  });

  test('ativa tenant pago e troca para outro plano mensal', async ({ page }) => {
    const plans = await listActivePlans();
    const mensalPlans = plans.filter((p) => p.cycle === 'mensal' && p.slug !== 'livre');
    if (mensalPlans.length < 2) {
      test.skip(true, 'Menos de 2 planos mensais ativos — teste ignorado');
      return;
    }

    const created = await createPersonalizadoViaApi(ts + 2, 'mensal');
    tenantId = created.id;

    const invoiceUrl = created.activation_invoice_url || await waitForActivationUrl(tenantId);

    await aguardarPagamentoManual(invoiceUrl, tenantId);

    const targetPlan =
      mensalPlans.find((p) => p.slug !== 'personalizado') ?? mensalPlans[1];
    await changePlanViaUI(page, tenantId, targetPlan.slug);

    await page.goto(`/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="billing-card"]')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Pago mensal → Pago anual', () => {
  test.setTimeout(360_000);
  let tenantId: string;

  test.afterAll(async () => {
    if (tenantId) {
      try {
        await cancelTenant(tenantId);
      } catch {}
      try {
        await deleteTenant(tenantId);
      } catch {}
    }
  });

  test('ativa tenant pago mensal e troca para plano anual', async ({ page }) => {
    const plans = await listActivePlans();
    const mensalPlans = plans.filter((p) => p.cycle === 'mensal' && p.slug !== 'livre');
    const anualPlan = plans.find((p) => p.cycle === 'anual');
    if (!mensalPlans.length || !anualPlan) {
      test.skip(true, 'Planos mensais ou anuais insuficientes — teste ignorado');
      return;
    }

    const created = await createPersonalizadoViaApi(ts + 3, 'mensal');
    tenantId = created.id;

    const invoiceUrl = created.activation_invoice_url || await waitForActivationUrl(tenantId);

    await aguardarPagamentoManual(invoiceUrl, tenantId);

    await changePlanViaUI(page, tenantId, anualPlan.slug);

    await page.goto(`/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="billing-card"]')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Pago anual → Pago mensal', () => {
  test.setTimeout(360_000);
  let tenantId: string;

  test.afterAll(async () => {
    if (tenantId) {
      try {
        await cancelTenant(tenantId);
      } catch {}
      try {
        await deleteTenant(tenantId);
      } catch {}
    }
  });

  test('ativa tenant pago anual e troca para plano mensal', async ({ page }) => {
    const plans = await listActivePlans();
    const anualPlans = plans.filter((p) => p.cycle === 'anual');
    const mensalPlan = plans.find((p) => p.cycle === 'mensal' && p.slug !== 'livre');
    if (!anualPlans.length || !mensalPlan) {
      test.skip(true, 'Planos anuais ou mensais insuficientes — teste ignorado');
      return;
    }

    const created = await createPersonalizadoViaApi(ts + 4, 'anual');
    tenantId = created.id;

    const invoiceUrl = created.activation_invoice_url || await waitForActivationUrl(tenantId);

    await aguardarPagamentoManual(invoiceUrl, tenantId);

    await changePlanViaUI(page, tenantId, mensalPlan.slug);

    await page.goto(`/tenants/${tenantId}`);
    await expect(page.locator('[data-testid="billing-card"]')).toBeVisible({ timeout: 15_000 });
  });
});
