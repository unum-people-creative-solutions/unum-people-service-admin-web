import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { cancelTenant, deleteTenant } from './helpers/api';

/**
 * Spec: Ciclo de vida do tenant — ações reais
 *
 * Testa ações de ciclo de vida de um tenant contra o backend real.
 * O tenant é criado via API diretamente (sem UI) para maior velocidade e
 * isolamento. A UI é usada apenas para verificar estado e executar ações.
 *
 * Auth: storageState injetado pelo global-setup (e2e/real/.auth/admin.json).
 * Cleanup: afterAll cancela e deleta o tenant via API (helpers/api.ts).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'admin.json');

async function getAuthToken(): Promise<string> {
  const raw = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
  const entries: Array<{ name: string; value: string }> = raw.origins?.[0]?.localStorage ?? [];
  const entry = entries.find((e) => e.name === 'admin-auth-storage');
  if (!entry) throw new Error('admin-auth-storage não encontrado no storageState');
  return (JSON.parse(entry.value) as { state: { token: string } }).state.token;
}

async function createLivreTenantViaApi(ts: number): Promise<string> {
  const token = await getAuthToken();

  const payload = {
    nome_negocio: `E2E Lifecycle ${ts}`,
    nome_admin: `Admin Lifecycle ${ts}`,
    email_contato: `e2e+lifecycle+${ts}@e2e-tests.dev`,
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
  };

  const res = await fetch(`${API_BASE}/admin/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao criar tenant via API: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

test.describe('Plano Livre — verifica status ATIVO após criação', () => {
  test.setTimeout(60_000);

  let tenantId: string;

  test.beforeAll(async () => {
    const ts = Date.now();
    tenantId = await createLivreTenantViaApi(ts);
  });

  test.afterAll(async () => {
    if (!tenantId) return;
    try {
      await cancelTenant(tenantId);
    } catch {
      // Pode já estar cancelado ou não existir
    }
    try {
      await deleteTenant(tenantId);
    } catch {
      // Ignora
    }
  });

  test('exibe badge ATIVO na página de detalhe do tenant recém-criado', async ({ page }) => {
    await page.goto(`/tenants/${tenantId}`);

    // Aguarda o carregamento: o badge de status deve aparecer
    await expect(page.getByText(/^ativo$/i)).toBeVisible();
  });
});

test.describe('Cancela contrato de tenant Plano Livre via UI', () => {
  test.setTimeout(60_000);

  let tenantIdCancel: string;

  test.beforeAll(async () => {
    const ts = Date.now() + 1;
    tenantIdCancel = await createLivreTenantViaApi(ts);
  });

  test.afterAll(async () => {
    if (!tenantIdCancel) return;
    try {
      await deleteTenant(tenantIdCancel);
    } catch {
      // Ignora — já pode ter sido removido
    }
  });

  test('cancela contrato via UI e verifica badge CANCELADO', async ({ page }) => {
    await page.goto(`/tenants/${tenantIdCancel}`);

    // Aguarda o carregamento da página
    await expect(page.getByText(/^ativo$/i)).toBeVisible();

    // Revela a Área de Perigo
    await page.getByRole('button', { name: /mostrar ações/i }).click();

    // Abre o modal de cancelamento
    await page.getByRole('button', { name: /cancelar contrato/i }).click();

    await expect(page.getByRole('heading', { name: /cancelar contrato/i })).toBeVisible();

    // Botão de confirmação deve estar desabilitado enquanto o input está vazio
    const confirmButton = page.getByRole('button', { name: /confirmar cancelamento/i });
    await expect(confirmButton).toBeDisabled();

    // Digita a frase exata para habilitar o botão
    await page.getByPlaceholder(/digite "cancelar contrato"/i).fill('cancelar contrato');
    await expect(confirmButton).toBeEnabled();

    // Confirma o cancelamento e aguarda a resposta da API
    await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes(`/admin/tenants/${tenantIdCancel}/cancel`) &&
        res.request().method() === 'POST'
      ),
      confirmButton.click(),
    ]);

    // Verifica que o badge mudou para CANCELADO (evita strict violation com o toast que também contém "cancelado")
    await expect(page.getByText(/cancelado/i).first()).toBeVisible();
  });
});
