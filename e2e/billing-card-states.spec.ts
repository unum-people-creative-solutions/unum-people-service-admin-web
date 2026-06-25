import { test, expect } from '@playwright/test';
import {
  buildTenant,
  mockAuthenticatedSession,
  mockTenantApi,
  TENANT_ID,
} from './fixtures/tenant';

/**
 * Spec 1 — navegação até o detalhe de um tenant e visualização do Card de
 * Billing nos diferentes estados de `subscription_url_state`.
 *
 * Espelha (em nível de E2E real de browser) os testes unitários T16 em
 * `src/components/tenants/BillingCard.test.tsx`.
 */
test.describe('Detalhe do tenant — Card de Billing por estado', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('navega até o detalhe do tenant e exibe o Card de Faturamento', async ({ page }) => {
    const tenant = buildTenant({
      status: 'ativo',
      contract: {
        plan_id: 'lp_basico',
        plan_type: 'pago',
        activation_fee: 0,
        monthly_value: 199,
        subscription_url_state: 'disponivel',
        subscription_invoice_url: 'https://asaas.com/i/fake-link',
        created_at: new Date().toISOString(),
      },
    });

    await mockTenantApi(page, { tenant });

    await page.goto(`/tenants/${TENANT_ID}`);

    await expect(page.getByRole('heading', { name: 'Faturamento' })).toBeVisible();
  });

  test('estado "aguardando_ativacao": exibe mensagem de pendência', async ({ page }) => {
    const tenant = buildTenant({
      status: 'ativo',
      contract: {
        plan_id: 'lp_basico',
        plan_type: 'pago',
        activation_fee: 0,
        monthly_value: 199,
        subscription_url_state: 'aguardando_ativacao',
        created_at: new Date().toISOString(),
      },
    });
    await mockTenantApi(page, { tenant });

    await page.goto(`/tenants/${TENANT_ID}`);

    await expect(page.getByText(/aguardando ativação|pendente/i)).toBeVisible();
  });

  test('estado "gerando": exibe mensagem de geração do link', async ({ page }) => {
    const tenant = buildTenant({
      status: 'ativo',
      contract: {
        plan_id: 'lp_basico',
        plan_type: 'pago',
        activation_fee: 0,
        monthly_value: 199,
        subscription_url_state: 'gerando',
        created_at: new Date().toISOString(),
      },
    });
    await mockTenantApi(page, { tenant });

    await page.goto(`/tenants/${TENANT_ID}`);

    await expect(page.getByText(/gerando/i)).toBeVisible();
  });

  test('estado "disponivel": exibe botão de copiar o link de pagamento', async ({ page }) => {
    const tenant = buildTenant({
      status: 'ativo',
      contract: {
        plan_id: 'lp_basico',
        plan_type: 'pago',
        activation_fee: 0,
        monthly_value: 199,
        subscription_url_state: 'disponivel',
        subscription_invoice_url: 'https://asaas.com/i/fake-link',
        created_at: new Date().toISOString(),
      },
    });
    await mockTenantApi(page, { tenant });

    await page.goto(`/tenants/${TENANT_ID}`);

    // Há outro botão "Copiar Chave" (API key) na página — escopamos a busca
    // ao texto exato do botão do Card de Billing para evitar ambiguidade.
    await expect(page.getByRole('button', { name: 'Copiar Link' })).toBeVisible();
    await expect(page.getByText(/link de pagamento/i)).toBeVisible();
  });

  test('estado "erro": exibe mensagem de erro e botão de tentar novamente', async ({ page }) => {
    const tenant = buildTenant({
      status: 'ativo',
      contract: {
        plan_id: 'lp_basico',
        plan_type: 'pago',
        activation_fee: 0,
        monthly_value: 199,
        subscription_url_state: 'erro',
        created_at: new Date().toISOString(),
      },
    });
    await mockTenantApi(page, { tenant });

    await page.goto(`/tenants/${TENANT_ID}`);

    await expect(page.getByText(/erro ao gerar/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
  });
});
