import { render, screen, within } from '@testing-library/react';
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

  // modo-teste-fase0 AC 9–10: o tenant de teste é identificado na listagem, e só ele.
  test('mostra o selo "Teste" só na linha do tenant de teste', async () => {
    const base = { documento: '0', plan_id: 'lp_basico', plan_value: 0, plan_cycle: 'mensal', status: 'ativo' };
    vi.mocked(tenantService.list).mockResolvedValue([
      { ...base, id: 't-teste', nome_negocio: 'Loja Fictícia', email_contato: 'f@x.com', is_test_tenant: true } as Tenant,
      { ...base, id: 't-real', nome_negocio: 'Parceiro Real', email_contato: 'r@x.com', is_test_tenant: false } as Tenant,
      { ...base, id: 't-sem', nome_negocio: 'Sem Campo', email_contato: 's@x.com' } as Tenant,
    ]);

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TenantsPage />
      </QueryClientProvider>
    );

    const linhaTeste = (await screen.findByText('Loja Fictícia')).closest('tr')!;
    // Papel img: o ARIA só admite nome acessível em papel que aceita nome (span genérico não).
    const selo = within(linhaTeste).getByRole('img', { name: 'Tenant de teste' });
    // Texto exato: toHaveTextContent aceitaria 'Teste de plano'.
    expect(selo.textContent).toBe('Teste');

    for (const nome of ['Parceiro Real', 'Sem Campo']) {
      const linha = screen.getByText(nome).closest('tr')!;
      expect(within(linha).queryByRole('img', { name: 'Tenant de teste' })).toBeNull();
      expect(within(linha).queryByText('Teste')).toBeNull();
    }
    expect(screen.getAllByRole('img', { name: 'Tenant de teste' })).toHaveLength(1);
  });
});
