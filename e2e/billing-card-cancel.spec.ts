import { test, expect } from '@playwright/test';
import { buildTenant, mockAuthenticatedSession, mockTenantApi, TENANT_ID } from './fixtures/tenant';

/**
 * Spec 3 — a ação "Cancelar contrato" exige confirmação (fluxo de 2 passos
 * via AlertDialog) antes de disparar a chamada de cancelamento.
 *
 * Espelha o teste unitário TASK-FE-003 em
 * `src/components/tenants/BillingCard.test.tsx`.
 */
test.describe('Detalhe do tenant — ação "Cancelar contrato"', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test('exige duas confirmações antes de chamar a API de cancelamento', async ({ page }) => {
    const tenant = buildTenant({ status: 'ativo' });

    let cancelCalled = false;
    await mockTenantApi(page, {
      tenant,
      onCancel: () => {
        cancelCalled = true;
        return { status: 200, body: { message: 'ok' } };
      },
    });

    await page.goto(`/tenants/${TENANT_ID}`);

    // 1. Clicar no botão principal de "Cancelar contrato" apenas abre o diálogo.
    const cancelButton = page.getByRole('button', { name: /cancelar contrato/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(page.getByText(/você tem certeza absoluta/i)).toBeVisible();
    expect(cancelCalled).toBe(false);

    // 2. Primeira confirmação ("Confirmar") apenas avança para o segundo passo.
    const firstConfirmButton = page.getByRole('button', { name: /confirmar/i });
    await expect(firstConfirmButton).toBeVisible();
    await firstConfirmButton.click();
    expect(cancelCalled).toBe(false);

    // 3. Segunda confirmação ("Tenho certeza") só então dispara a chamada real.
    const secondConfirmButton = page.getByRole('button', { name: /tenho certeza/i });
    await expect(secondConfirmButton).toBeVisible();
    await secondConfirmButton.click();

    await expect.poll(() => cancelCalled).toBe(true);
  });

  test('exibe alerta de erro se o cancelamento falhar, sem fechar o diálogo silenciosamente', async ({ page }) => {
    const tenant = buildTenant({ status: 'ativo' });

    await mockTenantApi(page, {
      tenant,
      onCancel: () => ({ status: 500, body: { error: 'Erro simulado ao cancelar' } }),
    });

    await page.goto(`/tenants/${TENANT_ID}`);

    await page.getByRole('button', { name: /cancelar contrato/i }).click();
    await page.getByRole('button', { name: /confirmar/i }).click();
    await page.getByRole('button', { name: /tenho certeza/i }).click();

    await expect(page.getByRole('alert')).toContainText(/erro|falha/i);

    // O diálogo NÃO deve fechar silenciosamente em caso de erro — o botão
    // "Tenho certeza" volta a ficar visível/habilitado (não "Cancelando...")
    // dentro do mesmo AlertDialog aberto, permitindo nova tentativa.
    const retryButton = page.getByRole('button', { name: /tenho certeza/i });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
  });
});
