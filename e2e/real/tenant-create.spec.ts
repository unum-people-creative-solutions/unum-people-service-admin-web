import { test, expect } from '@playwright/test';
import { cancelTenant, deleteTenant, listPlans } from './helpers/api';

test.describe('Criação de tenant — fluxos reais contra o backend', () => {
  let createdTenantId: string | null = null;
  const ts = Date.now();

  test.afterEach(async () => {
    if (createdTenantId) {
      const id = createdTenantId;
      createdTenantId = null;
      try {
        await cancelTenant(id);
      } catch (e) {
        console.warn(`[cleanup] cancelTenant(${id}) falhou:`, e);
      }
      try {
        await deleteTenant(id);
      } catch (e) {
        console.warn(`[cleanup] deleteTenant(${id}) falhou:`, e);
      }
    }
  });

  test('Plano Livre — cria tenant com status ATIVO imediato', async ({ page }) => {
    await page.goto('/tenants/new');

    // Dados do negócio
    await page.getByPlaceholder(/unum solutions/i).fill(`E2E Livre ${ts}`);
    await page.locator('input[placeholder*="Tecnologia"]').fill('Tecnologia');

    // Administrador
    await page.getByPlaceholder(/nome do responsável/i).fill(`Admin Livre ${ts}`);
    await page.getByPlaceholder('contato@empresa.com').fill(`livre-${ts}@e2e-test.invalid`);

    // Marcar como tenant de teste
    const isTestCheckbox = page.getByRole('checkbox', { name: /tenant de teste/i });
    if (await isTestCheckbox.isVisible()) {
      await isTestCheckbox.check();
    }

    // Selecionar plano Livre
    await page.locator('#plan_id').selectOption('livre');

    // Garantir que o serviço 'site' está selecionado
    const siteCheckbox = page.locator('input[type="checkbox"][value="site"]');
    await siteCheckbox.check();

    // Capturar resposta da criação e submeter
    const [response] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/admin/tenants') && r.request().method() === 'POST' && !r.url().includes('/users'),
        { timeout: 30_000 }
      ),
      page.getByRole('button', { name: /criar tenant/i }).click(),
    ]);

    const created = await response.json();
    createdTenantId = created.id;
    expect(createdTenantId, 'ID do tenant criado deve estar presente na resposta').toBeTruthy();

    // Navegar ao detalhe do tenant e verificar status ATIVO
    await page.goto(`/tenants/${createdTenantId}`);
    await expect(page.getByText(/ativo/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Plano Personalizado — cria tenant com cobrança de ativação no Asaas', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/tenants/new');

    // Dados do negócio
    await page.getByPlaceholder(/unum solutions/i).fill(`E2E Personalizado ${ts}`);
    await page.locator('input[placeholder*="Tecnologia"]').fill('Saúde');

    // Administrador
    await page.getByPlaceholder(/nome do responsável/i).fill(`Admin Personalizado ${ts}`);
    await page.getByPlaceholder('contato@empresa.com').fill(`personalizado-${ts}@e2e-test.invalid`);

    // Marcar como tenant de teste
    const isTestCheckbox = page.getByRole('checkbox', { name: /tenant de teste/i });
    if (await isTestCheckbox.isVisible()) {
      await isTestCheckbox.check();
    }

    // Selecionar plano Personalizado (expõe campos de pagamento)
    await page.locator('#plan_id').selectOption('personalizado');

    // CPF de teste válido no sandbox do Asaas
    await page.locator('#documento').fill('123.456.789-09');

    // Métodos de pagamento
    await page.locator('#activation_billing_type').selectOption('pix');
    await page.locator('#subscription_billing_type').selectOption('pix');

    // Preencher valores via CurrencyInputBR (digitar em centavos como string)
    await page.locator('#activation_fee').click();
    await page.keyboard.type('9990');

    await page.locator('#monthly_value').click();
    await page.keyboard.type('4990');

    // Marcar serviço 'site'
    await page.locator('input[type="checkbox"][value="site"]').check();

    // Capturar resposta e submeter
    const [response] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/admin/tenants') && r.request().method() === 'POST' && !r.url().includes('/users'),
        { timeout: 30_000 }
      ),
      page.getByRole('button', { name: /criar tenant/i }).click(),
    ]);

    const created = await response.json();
    createdTenantId = created.id;
    expect(createdTenantId, 'ID do tenant criado deve estar presente na resposta').toBeTruthy();

    // Navegar ao detalhe e verificar status AGUARDANDO ATIVAÇÃO
    await page.goto(`/tenants/${createdTenantId}`);
    await expect(page.getByText(/aguardando ativação/i).first()).toBeVisible({ timeout: 15_000 });

    // BillingCard deve exibir link de ativação (activation_invoice_url gerado pelo Asaas)
    await expect(page.getByRole('link', { name: /link de ativação/i })).toBeVisible({ timeout: 15_000 });
  });

  test('Plano pago (primeiro plano ativo) — preenche valores automaticamente', async ({ page }) => {
    test.setTimeout(60_000);

    // Buscar planos via API antes de navegar
    const plansData = await listPlans();
    const activePlans = plansData.active ?? [];

    if (activePlans.length === 0) {
      test.skip(true, 'Nenhum plano ativo encontrado no backend — teste ignorado');
      return;
    }

    const firstPlan = activePlans[0];

    await page.goto('/tenants/new');

    // Dados do negócio
    await page.getByPlaceholder(/unum solutions/i).fill(`E2E Pago ${ts}`);
    await page.locator('input[placeholder*="Tecnologia"]').fill('Varejo');

    // Administrador
    await page.getByPlaceholder(/nome do responsável/i).fill(`Admin Pago ${ts}`);
    await page.getByPlaceholder('contato@empresa.com').fill(`pago-${ts}@e2e-test.invalid`);

    // Marcar como tenant de teste
    const isTestCheckbox = page.getByRole('checkbox', { name: /tenant de teste/i });
    if (await isTestCheckbox.isVisible()) {
      await isTestCheckbox.check();
    }

    // Selecionar o primeiro plano ativo pelo slug
    await page.locator('#plan_id').selectOption(firstPlan.slug);

    // CPF de teste válido no sandbox do Asaas
    await page.locator('#documento').fill('123.456.789-09');

    // Métodos de pagamento (PIX + PIX)
    await page.locator('#activation_billing_type').selectOption('pix');
    // O campo de assinatura pode estar oculto para ciclos anuais
    const subscriptionSelect = page.locator('#subscription_billing_type');
    if (await subscriptionSelect.isVisible()) {
      await subscriptionSelect.selectOption('pix');
    }

    // Verificar que os campos de valor estão readonly e preenchidos pelo plano
    const activationFeeInput = page.locator('#activation_fee');
    const monthlyValueInput = page.locator('#monthly_value');

    if (await activationFeeInput.isVisible()) {
      await expect(activationFeeInput).toHaveAttribute('readonly');
    }
    if (await monthlyValueInput.isVisible()) {
      await expect(monthlyValueInput).toHaveAttribute('readonly');
    }

    // Capturar resposta e submeter
    const [response] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/admin/tenants') && r.request().method() === 'POST' && !r.url().includes('/users'),
        { timeout: 30_000 }
      ),
      page.getByRole('button', { name: /criar tenant/i }).click(),
    ]);

    const created = await response.json();
    createdTenantId = created.id;
    expect(createdTenantId, 'ID do tenant criado deve estar presente na resposta').toBeTruthy();

    // Navegar ao detalhe e verificar status AGUARDANDO ATIVAÇÃO
    await page.goto(`/tenants/${createdTenantId}`);
    await expect(page.getByText(/aguardando ativação/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
