import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TenantDetailsPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockTenant = {
  id: 'tenant-123',
  nome_negocio: 'Empresa Teste',
  email_contato: 'contato@teste.com',
  documento: '12345678900',
  nicho: 'SAUDE',
  site_url: 'https://teste.com',
  api_key: 'up_test_key_123456789',
  enabled_services: ['crm'],
  google_ads_customer_id: '123-456-7890',
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

describe('TenantDetailsPage - Refactor Requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any);
    vi.mocked(tenantService.getById).mockResolvedValue(mockTenant as any);
  });

  test('deve renderizar os novos campos editáveis', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByDisplayValue('SAUDE')).toBeDefined();
    expect(screen.getByDisplayValue('https://teste.com')).toBeDefined();
  });

  test('deve exibir a API Key ofuscada e permitir revelação', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    // Deve encontrar o texto ofuscado (ou um input com valor ofuscado)
    const apiKeyInput = await screen.findByDisplayValue(/up_••••/);
    expect(apiKeyInput).toBeDefined();

    // Clica no botão de revelar (olhinho)
    const revealBtn = screen.getByRole('button', { name: /revelar/i });
    fireEvent.click(revealBtn);

    expect(screen.getByDisplayValue('up_test_key_123456789')).toBeDefined();
  });

  test('deve exigir confirmação textual para exclusão lógica', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
    fireEvent.click(deleteBtn);

    // Modal deve aparecer
    expect(await screen.findByText(/Confirmar Exclusão Lógica/i)).toBeDefined();
    
    const confirmBtn = screen.getByRole('button', { name: /confirmar exclusão/i });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/digite "excluir tenant"/i);
    fireEvent.change(input, { target: { value: 'excluir tenant' } });

    expect(confirmBtn).not.toBeDisabled();
  });

  test('deve exibir aviso crítico ao habilitar Hard Delete', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const hardDeleteSwitch = await screen.findByLabelText(/Hard Delete/i);
    fireEvent.click(hardDeleteSwitch);

    // Deve mostrar aviso de que a deleção será física
    expect(await screen.findByText(/Atenção: Deleção Física Ativada/i)).toBeDefined();
  });

  test('deve alternar LED de Sincronizado (Verde) para Alterações Pendentes (Vermelho) ao editar', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    // Inicialmente deve estar Sincronizado (Verde)
    const syncedLeds = await screen.findAllByText(/Sincronizado/i);
    expect(syncedLeds).toHaveLength(3);

    // Edita um campo do card de Dados Institucionais
    const input = screen.getByDisplayValue('Empresa Teste');
    fireEvent.change(input, { target: { value: 'Novo Nome' } });

    // LED de Dados Institucionais deve mudar para Vermelho
    const pendingLeds = await screen.findAllByText(/Alterações Pendentes/i);
    expect(pendingLeds).toHaveLength(1);
    expect(screen.getAllByText(/Sincronizado/i)).toHaveLength(2);
  });
});
