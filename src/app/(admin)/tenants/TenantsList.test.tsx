import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TenantsPage from './page';
import { tenantService } from '@/services/tenantService';
import type { Tenant } from '@/types/tenant';

vi.mock('@/services/tenantService', () => ({
  tenantService: { list: vi.fn() },
}));

describe('TenantsPage', () => {
  // O tenant de demonstração tem "#" no ID. Sem codificar, o navegador trata
  // "#DEMO_REVIEW" como âncora e a página de detalhes recebe só "TENANT".
  test('o link de detalhes codifica o ID do tenant', async () => {
    vi.mocked(tenantService.list).mockResolvedValue([
      {
        id: 'TENANT#DEMO_REVIEW',
        nome_negocio: 'Empresa Demonstração',
        email_contato: 'demo@example.com',
        documento: '00000000000',
        plan_id: 'lp_basico',
        plan_value: 0,
        plan_cycle: 'mensal',
        status: 'ativo',
      } as Tenant,
    ]);

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TenantsPage />
      </QueryClientProvider>
    );

    const link = await screen.findByRole('link', { name: 'Detalhes' });
    expect(link).toHaveAttribute('href', '/tenants/TENANT%23DEMO_REVIEW');
  });
});
