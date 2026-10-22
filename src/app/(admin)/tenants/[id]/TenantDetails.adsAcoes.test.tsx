import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TenantDetailsPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';

// A seção de usuários lê catálogo e papéis (gestao-de-acesso-f2).
vi.mock('@/services/acessoService', () => ({
  acessoService: {
    catalogo: vi.fn().mockResolvedValue({ ferramentas: [] }),
    listarPapeis: vi.fn().mockResolvedValue([]),
    historico: vi.fn().mockResolvedValue({ registros: [], cursor: '' }),
  },
}));

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getById: vi.fn(),
    update: vi.fn(),
    changePlan: vi.fn(),
    updateBillingMethod: vi.fn(),
    delete: vi.fn(),
    resetPassword: vi.fn(),
    listUsers: vi.fn().mockResolvedValue([]),
    cancelContract: vi.fn(),
    listInvoices: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({
      active: [{ slug: 'lp_basico', nome: 'LP Básico', monthly_value: 199, activation_fee: 0, included_services: ['site', 'blog'] }],
      inactive: [],
    }),
  },
}));

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn().mockResolvedValue([
      { id: 'term_mock_1', name: 'Termo Mock', description: '', is_active: true, current_version: 1 },
    ]),
  },
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const mockTenant = {
  id: 'tenant-123',
  nome_negocio: 'Empresa Teste',
  email_contato: 'contato@teste.com',
  documento: '12345678909',
  nicho: 'SAUDE',
  site_url: 'https://teste.com',
  api_key: 'up_test_key_123456789',
  enabled_services: ['site', 'blog'],
  google_ads_customer_id: '123-456-7890',
  ads_conversion_action_id: '555',
  use_mcc_auth: false,
  plan_id: 'lp_basico',
  plan_status: 'ativo',
  plan_value: 199,
  plan_cycle: 'mensal',
  activated_at: new Date().toISOString(),
  next_billing_at: new Date().toISOString(),
  renewal_at: new Date().toISOString(),
  is_blocked: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantDetailsPage />
    </QueryClientProvider>
  );
}

// Funil do Configurador, fase 1 (spec funil-configurador-f1 US 19, T85): o operador
// configura a Ação de venda e a Ação de recorrência na seção de integrações.
describe('TenantDetailsPage - ações de conversão do Google Ads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);
    vi.mocked(tenantService.getById).mockResolvedValue(mockTenant as never);
    vi.mocked(tenantService.update).mockResolvedValue({ message: 'ok' });
  });

  test('mostra os dois campos com os valores do tenant e o texto explicativo', async () => {
    renderPage();

    expect(await screen.findByRole('textbox', { name: 'Ação de venda' })).toHaveValue('555');
    expect(screen.getByRole('textbox', { name: 'Ação de recorrência (opcional)' })).toHaveValue('');
    expect(screen.getByText('Sem a Ação de venda, nenhuma venda é enviada.')).toBeInTheDocument();
    expect(screen.getByText(/depois de ctId= no endereço/)).toBeInTheDocument();
  });

  test('alterar a Ação de recorrência envia só a chave alterada', async () => {
    renderPage();

    const recorrencia = await screen.findByRole('textbox', { name: 'Ação de recorrência (opcional)' });
    fireEvent.change(recorrencia, { target: { value: '777' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(tenantService.update).toHaveBeenCalledTimes(1));
    const enviado = vi.mocked(tenantService.update).mock.calls[0][1] as Record<string, unknown>;
    expect(enviado.ads_recurring_conversion_action_id).toBe('777');
    expect(enviado).not.toHaveProperty('ads_conversion_action_id');
  });
});
