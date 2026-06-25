import { test, expect } from '@playwright/test';
import { buildTenant, mockAuthenticatedSession, mockTenantApi, TENANT_ID } from './fixtures/tenant';

/**
 * Spec 2 — a ação "Reativar assinatura" só deve aparecer (e ser acionável)
 * quando o tenant está no status "pausado".
 *
 * Espelha os testes unitários UI-07/UI-08 em
 * `src/components/tenants/BillingCard.test.tsx`.
 */
test.describe('Detalhe do tenant — ação "Reativar assinatura"', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('NÃO exibe o botão "Reativar" quando o tenant está ativo', async ({ page }) => {
    const tenant = buildTenant({ status: 'ativo' });
    await mockTenantApi(page, { tenant });

    await page.goto(`/tenants/${TENANT_ID}`);

    await expect(page.getByRole('heading', { name: 'Faturamento' })).toBeVisible();
    await expect(page.getByRole('button', { name: /reativar/i })).toHaveCount(0);
  });

  test('exibe o botão "Reativar" quando o tenant está pausado e dispara a reativação ao clicar', async ({ page }) => {
    const tenant = buildTenant({ status: 'pausado' });

    let reactivateCalled = false;
    await mockTenantApi(page, {
      tenant,
      onReactivate: () => {
        reactivateCalled = true;
        return { status: 200, body: { message: 'ok' } };
      },
    });

    await page.goto(`/tenants/${TENANT_ID}`);

    const reactivateButton = page.getByRole('button', { name: /reativar/i });
    await expect(reactivateButton).toBeVisible();

    await reactivateButton.click();

    await expect.poll(() => reactivateCalled).toBe(true);
  });
});
