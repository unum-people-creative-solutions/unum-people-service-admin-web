import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Spec: CRUD completo de planos — backend real
 *
 * Testa a criação, edição, desativação e exclusão de planos via UI,
 * contra o backend real em produção/sandbox.
 *
 * Auth: storageState injetado pelo global-setup (e2e/real/.auth/admin.json).
 * Cleanup: afterAll deleta o plano via API diretamente.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';
const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'admin.json');

// Timestamp fixo no nível do módulo para garantir consistência entre todos os testes
// do describe (o callback do describe é invocado múltiplas vezes pelo Playwright).
const ts = Date.now();
const planSlug = `e2e-test-${ts}`;
const planNome = `Plano E2E ${ts}`;
const anualSlug = `e2e-anual-${ts}`;
const anualNome = `Plano Anual E2E ${ts}`;
const mensal2Slug = `e2e-mensal2-${ts}`;
const mensal2Nome = `Plano Mensal2 E2E ${ts}`;

async function getAuthToken(): Promise<string> {
  const raw = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
  const entries: Array<{ name: string; value: string }> = raw.origins?.[0]?.localStorage ?? [];
  const entry = entries.find((e) => e.name === 'admin-auth-storage');
  if (!entry) throw new Error('admin-auth-storage não encontrado no storageState');
  return (JSON.parse(entry.value) as { state: { token: string } }).state.token;
}

async function deletePlanViaApi(slug: string): Promise<void> {
  const token = await getAuthToken();
  await fetch(`${API_BASE}/admin/plans/${slug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // Ignora erros — o plano pode já ter sido excluído pelo teste
}

test.describe('CRUD de planos — backend real', () => {
  test.setTimeout(60_000);

  test.afterAll(async () => {
    try {
      await deletePlanViaApi(planSlug);
      await deletePlanViaApi(`${planSlug}`);
    } catch {
      // Ignora — pode já ter sido limpo pelo teste 3
    }
  });

  test('Cria novo plano e verifica na lista de ativos', async ({ page }) => {
    await page.goto('/plans');

    await page.getByRole('button', { name: /novo plano/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('ex: basico_mensal').fill(planSlug);
    await dialog.getByPlaceholder('ex: Básico Mensal').fill(planNome);
    await dialog.getByPlaceholder('Descrição comercial').fill('Plano de teste E2E');

    await dialog.locator('#cycle').selectOption('mensal');

    // CurrencyInputBR: formata automaticamente ao digitar
    await dialog.locator('#activation_fee').click();
    await page.keyboard.type('15000'); // → R$ 150,00

    await dialog.locator('#monthly_value').click();
    await page.keyboard.type('9990'); // → R$ 99,90

    await dialog.getByPlaceholder(/ex: crm/i).fill('site');

    // is_active marcado por padrão — verifica sem alterar
    await expect(dialog.locator('#is_active')).toBeChecked();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'POST'),
      dialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(dialog).not.toBeVisible();

    const ativosSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /planos ativos/i }) });
    await expect(ativosSection.getByRole('heading', { name: planNome })).toBeVisible();
  });

  test('Edita o plano criado', async ({ page }) => {
    await page.goto('/plans');

    await page.getByRole('button', { name: new RegExp(`Editar ${planNome}`, 'i') }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: new RegExp(planNome, 'i') })).toBeVisible();

    const nomeInput = dialog.getByPlaceholder('ex: Básico Mensal');
    await nomeInput.clear();
    await nomeInput.fill(`${planNome} Editado`);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'PUT'),
      dialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(dialog).not.toBeVisible();

    const ativosSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /planos ativos/i }) });
    await expect(ativosSection.getByRole('heading', { name: `${planNome} Editado` })).toBeVisible();
  });

  test('Desativa e exclui o plano', async ({ page }) => {
    const nomeEditado = `${planNome} Editado`;

    await page.goto('/plans');

    // Desativa: abre drawer e desmarca is_active
    await page.getByRole('button', { name: new RegExp(`Editar ${nomeEditado}`, 'i') }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const isActiveCheckbox = dialog.locator('#is_active');
    await expect(isActiveCheckbox).toBeChecked();
    await isActiveCheckbox.uncheck();
    await expect(isActiveCheckbox).not.toBeChecked();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'PUT'),
      dialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(dialog).not.toBeVisible();

    const desativadosSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /planos desativados/i }) });
    await expect(desativadosSection.getByRole('heading', { name: nomeEditado })).toBeVisible();

    // Exclui: clica no botão Excluir na seção de desativados
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'DELETE'),
      desativadosSection.getByRole('button', { name: new RegExp(`Excluir ${nomeEditado}`, 'i') }).click(),
    ]);

    await expect(page.getByRole('heading', { name: nomeEditado })).not.toBeVisible();
  });
});

test.describe('Plano anual — criação e edição de valor', () => {
  test.setTimeout(60_000);

  test.afterAll(async () => {
    try {
      await deletePlanViaApi(anualSlug);
    } catch {
      // Ignora
    }
  });

  test('Cria plano anual e verifica que campo Mensalidade está oculto', async ({ page }) => {
    await page.goto('/plans');

    await page.getByRole('button', { name: /novo plano/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('ex: basico_mensal').fill(anualSlug);
    await dialog.getByPlaceholder('ex: Básico Mensal').fill(anualNome);
    await dialog.getByPlaceholder('Descrição comercial').fill('Plano anual de teste E2E');

    await dialog.locator('#cycle').selectOption('anual');

    await expect(dialog.locator('#monthly_value')).not.toBeVisible();

    await dialog.locator('#activation_fee').click();
    await page.keyboard.type('240000');

    await dialog.getByPlaceholder(/ex: crm/i).fill('site');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'POST'),
      dialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(dialog).not.toBeVisible();

    const ativosSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /planos ativos/i }) });
    await expect(ativosSection.getByRole('heading', { name: anualNome })).toBeVisible();
  });

  test('Edita valor do plano anual (Valor Anual)', async ({ page }) => {
    await page.goto('/plans');

    await page.getByRole('button', { name: new RegExp(`Editar ${anualNome}`, 'i') }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.locator('#monthly_value')).not.toBeVisible();

    const activationFeeInput = dialog.locator('#activation_fee');
    await activationFeeInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('360000');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'PUT'),
      dialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(dialog).not.toBeVisible();

    await page.goto('/plans');

    const ativosSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /planos ativos/i }) });
    await expect(ativosSection.getByRole('heading', { name: anualNome })).toBeVisible();
  });
});

test.describe('Plano mensal — edição de valores (taxa e mensalidade)', () => {
  test.setTimeout(60_000);

  test.afterAll(async () => {
    try {
      await deletePlanViaApi(mensal2Slug);
    } catch {
      // Ignora
    }
  });

  test('Cria plano mensal e edita taxa de adesão e mensalidade', async ({ page }) => {
    await page.goto('/plans');

    await page.getByRole('button', { name: /novo plano/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('ex: basico_mensal').fill(mensal2Slug);
    await dialog.getByPlaceholder('ex: Básico Mensal').fill(mensal2Nome);
    await dialog.getByPlaceholder('Descrição comercial').fill('Plano mensal 2 de teste E2E');

    await dialog.locator('#cycle').selectOption('mensal');

    await dialog.locator('#activation_fee').click();
    await page.keyboard.type('20000');

    await dialog.locator('#monthly_value').click();
    await page.keyboard.type('7990');

    await dialog.getByPlaceholder(/ex: crm/i).fill('site');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'POST'),
      dialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(dialog).not.toBeVisible();

    const ativosSection = page.locator('section').filter({ has: page.locator('h2', { hasText: /planos ativos/i }) });
    await expect(ativosSection.getByRole('heading', { name: mensal2Nome })).toBeVisible();

    await page.getByRole('button', { name: new RegExp(`Editar ${mensal2Nome}`, 'i') }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();

    const activationFeeInput = editDialog.locator('#activation_fee');
    await activationFeeInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('30000');

    const monthlyValueInput = editDialog.locator('#monthly_value');
    await monthlyValueInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type('9990');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/admin/plans') && res.request().method() === 'PUT'),
      editDialog.getByRole('button', { name: /salvar plano/i }).click(),
    ]);

    await expect(editDialog).not.toBeVisible();
  });
});
