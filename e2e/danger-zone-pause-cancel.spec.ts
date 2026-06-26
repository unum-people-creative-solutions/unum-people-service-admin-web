import { test, expect } from '@playwright/test';
import { buildTenant, mockAuthenticatedSession, mockTenantApi, TENANT_ID } from './fixtures/tenant';

/**
 * Spec 3 — as ações "Pausar Assinatura" e "Cancelar Contrato" agora vivem na
 * Área de Perigo da página de detalhe do tenant (`src/app/(admin)/tenants/[id]/page.tsx`),
 * reveladas pelo botão "MOSTRAR AÇÕES", substituindo o antigo fluxo de
 * "Cancelar contrato" de 2 passos que vivia no `BillingCard.tsx`.
 *
 * - "Pausar Assinatura": confirmação simples via AlertDialog ("Confirmar Pausa")
 *   → `tenantService.pauseSubscription(id)` → `POST /admin/tenants/{id}/pause`.
 * - "Cancelar Contrato": modal que exige digitar a frase exata
 *   "cancelar contrato" antes de habilitar "Confirmar Cancelamento"
 *   → `tenantService.cancelContract(id)` → `POST /admin/tenants/{id}/cancel`.
 *
 * Espelha os testes unitários T10/T11 em
 * `src/app/(admin)/tenants/[id]/TenantDetails.test.tsx`.
 */
test.describe('Detalhe do tenant — Área de Perigo', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
  });

  test.describe('ação "Pausar Assinatura"', () => {
    test('exige confirmação antes de chamar a API de pausa', async ({ page }) => {
      const tenant = buildTenant({ status: 'ativo' });

      let pauseCalled = false;
      await mockTenantApi(page, {
        tenant,
        onPause: () => {
          pauseCalled = true;
          return { status: 200, body: { message: 'ok' } };
        },
      });

      await page.goto(`/tenants/${TENANT_ID}`);

      await page.getByRole('button', { name: /mostrar ações/i }).click();

      // 1. Clicar no botão principal de "Pausar Assinatura" apenas abre o diálogo.
      const pauseButton = page.getByRole('button', { name: /pausar assinatura/i });
      await expect(pauseButton).toBeVisible();
      await pauseButton.click();

      const confirmButton = page.getByRole('button', { name: /confirmar pausa/i });
      await expect(confirmButton).toBeVisible();
      expect(pauseCalled).toBe(false);

      // 2. Confirmar dispara a chamada real.
      await confirmButton.click();

      await expect.poll(() => pauseCalled).toBe(true);
    });

    test('exibe alerta de erro visível se a pausa falhar', async ({ page }) => {
      const tenant = buildTenant({ status: 'ativo' });

      await mockTenantApi(page, {
        tenant,
        onPause: () => ({ status: 500, body: { error: 'Erro simulado ao pausar' } }),
      });

      await page.goto(`/tenants/${TENANT_ID}`);

      await page.getByRole('button', { name: /mostrar ações/i }).click();
      await page.getByRole('button', { name: /pausar assinatura/i }).click();
      await page.getByRole('button', { name: /confirmar pausa/i }).click();

      // A falha não pode ser engolida silenciosamente — o erro retornado
      // pela API é exibido como alerta visível na página.
      await expect(page.getByText(/erro simulado ao pausar/i)).toBeVisible();
    });
  });

  test.describe('ação "Cancelar Contrato"', () => {
    test('exige a frase exata "cancelar contrato" antes de habilitar a confirmação', async ({ page }) => {
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

      await page.getByRole('button', { name: /mostrar ações/i }).click();

      // 1. Clicar no botão principal de "Cancelar Contrato" apenas abre o modal.
      const cancelButton = page.getByRole('button', { name: /cancelar contrato/i });
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();

      await expect(page.getByRole('heading', { name: /cancelar contrato/i })).toBeVisible();

      const confirmButton = page.getByRole('button', { name: /confirmar cancelamento/i });
      await expect(confirmButton).toBeVisible();
      await expect(confirmButton).toBeDisabled();
      expect(cancelCalled).toBe(false);

      // 2. Digitar a frase exata habilita o botão.
      const input = page.getByPlaceholder(/digite "cancelar contrato"/i);
      await input.fill('cancelar contrato');
      await expect(confirmButton).toBeEnabled();

      // 3. Confirmar dispara a chamada real.
      await confirmButton.click();

      await expect.poll(() => cancelCalled).toBe(true);
    });

    test('exibe alerta de erro visível se o cancelamento falhar', async ({ page }) => {
      const tenant = buildTenant({ status: 'ativo' });

      await mockTenantApi(page, {
        tenant,
        onCancel: () => ({ status: 500, body: { error: 'Erro simulado ao cancelar' } }),
      });

      await page.goto(`/tenants/${TENANT_ID}`);

      await page.getByRole('button', { name: /mostrar ações/i }).click();
      await page.getByRole('button', { name: /cancelar contrato/i }).click();

      const input = page.getByPlaceholder(/digite "cancelar contrato"/i);
      await input.fill('cancelar contrato');

      await page.getByRole('button', { name: /confirmar cancelamento/i }).click();

      // A falha não pode ser engolida silenciosamente — o erro retornado
      // pela API é exibido como alerta visível na página.
      await expect(page.getByText(/erro simulado ao cancelar/i)).toBeVisible();
    });
  });
});
