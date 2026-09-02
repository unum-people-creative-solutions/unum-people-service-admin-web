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

describe('TenantDetailsPage - T15/T16 site_urls (edição)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: 'tenant-123' });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);
    vi.mocked(tenantService.getById).mockResolvedValue(mockTenant as never);
    vi.mocked(tenantService.update).mockResolvedValue({ message: 'ok' });
  });

  test('abrir a tela sem editar não marca dirty (salvar permanece desabilitado)', async () => {
    renderPage();

    await screen.findByRole('textbox', { name: /url do site/i });
    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    expect(saveBtn).toBeDisabled();
    expect(tenantService.update).not.toHaveBeenCalled();
  });

  test('adicionar um segundo site, remover o primeiro e salvar envia a lista resultante', async () => {
    renderPage();

    const firstUrl = await screen.findByRole('textbox', { name: /url do site/i });
    expect(firstUrl).toHaveValue('https://teste.com');

    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    expect(saveBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /adicionar site/i }));

    const urlInputs = screen.getAllByRole('textbox', { name: /url do site/i });
    expect(urlInputs).toHaveLength(2);
    fireEvent.change(urlInputs[1], { target: { value: 'https://b.com' } });

    const removeButtons = screen.getAllByRole('button', { name: /remover site/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox', { name: /url do site/i })).toHaveLength(1);
    });
    expect(screen.getByRole('textbox', { name: /url do site/i })).toHaveValue('https://b.com');
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(tenantService.update).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({
          site_urls: ['https://b.com'],
        }),
      );
    });
  });

  test('T16 — erro 400 do backend aparece na interface', async () => {
    vi.mocked(tenantService.update).mockRejectedValue(
      new Error('Lista de URLs de sites inválida'),
    );

    renderPage();

    await screen.findByRole('textbox', { name: /url do site/i });
    fireEvent.click(screen.getByRole('button', { name: /adicionar site/i }));

    const urlInputs = screen.getAllByRole('textbox', { name: /url do site/i });
    fireEvent.change(urlInputs[1], { target: { value: 'https://b.com' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/lista de urls de sites inválida/i);
  });

  test('abrir a tela sem editar mostra LED de Dados Básicos sincronizado', async () => {
    renderPage();

    await screen.findByRole('textbox', { name: /url do site/i });
    expect(screen.getByRole('status', { name: /dados básicos: sincronizado/i })).toBeInTheDocument();
  });

  test('adicionar um site acende o LED de Dados Básicos', async () => {
    renderPage();

    await screen.findByRole('textbox', { name: /url do site/i });
    fireEvent.click(screen.getByRole('button', { name: /adicionar site/i }));

    expect(screen.getByRole('status', { name: /dados básicos: alterações pendentes/i })).toBeInTheDocument();
  });

  test('remover um site acende o LED de Dados Básicos', async () => {
    renderPage();

    await screen.findByRole('textbox', { name: /url do site/i });
    fireEvent.click(screen.getByRole('button', { name: /remover site/i }));

    expect(screen.getByRole('status', { name: /dados básicos: alterações pendentes/i })).toBeInTheDocument();
  });
});
