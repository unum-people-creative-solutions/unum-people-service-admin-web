import { render, screen } from '@testing-library/react';
import { TenantInvoicesSection } from './TenantInvoicesSection';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { tenantService } from '@/services/tenantService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    listInvoices: vi.fn(),
  },
}));

describe('TenantInvoicesSection Component', () => {
  const mockTenantId = 'tenant-123';
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  test('T33 - renderiza cada estado da nota fiscal corretamente', async () => {
    const mockInvoices = [
      {
        asaas_invoice_id: 'inv-1',
        status: 'SCHEDULED' as const,
        effective_date: '2026-07-15T00:00:00Z',
        created_at: '2026-07-15T10:00:00Z',
      },
      {
        asaas_invoice_id: 'inv-2',
        status: 'SYNCHRONIZED' as const,
        effective_date: '2026-07-15T00:00:00Z',
        created_at: '2026-07-15T11:00:00Z',
      },
      {
        asaas_invoice_id: 'inv-3',
        status: 'AUTHORIZED' as const,
        pdf_url: 'https://pdf.url/3',
        effective_date: '2026-07-15T00:00:00Z',
        created_at: '2026-07-15T12:00:00Z',
      },
      {
        asaas_invoice_id: 'inv-4',
        status: 'ERROR' as const,
        error_reason: 'CPF/CNPJ inválido',
        effective_date: '2026-07-15T00:00:00Z',
        created_at: '2026-07-15T13:00:00Z',
      },
    ];

    vi.mocked(tenantService.listInvoices).mockResolvedValue(mockInvoices as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantInvoicesSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    // Espera os dados carregarem usando findByText com matcher específico na tag span
    const agendadaEl = await screen.findByText((content, el) => {
      return el?.tagName.toLowerCase() === 'span' && el?.textContent?.trim() === 'Agendada';
    });
    expect(agendadaEl).toBeDefined();

    expect(screen.getByText((content, el) => el?.tagName.toLowerCase() === 'span' && el?.textContent?.trim() === 'Sincronizada')).toBeDefined();
    expect(screen.getByText((content, el) => el?.tagName.toLowerCase() === 'span' && el?.textContent?.trim() === 'Autorizada')).toBeDefined();
    expect(screen.getByText((content, el) => el?.tagName.toLowerCase() === 'span' && el?.textContent?.trim() === 'Erro')).toBeDefined();
    expect(screen.getByText(/CPF\/CNPJ inválido/)).toBeDefined();
  });

  test('T34 - estado AUTHORIZED exibe link de download de PDF visivel e correto', async () => {
    const mockInvoices = [
      {
        asaas_invoice_id: 'inv-3',
        status: 'AUTHORIZED' as const,
        pdf_url: 'https://pdf.url/3',
        effective_date: '2026-07-15T00:00:00Z',
        created_at: '2026-07-15T12:00:00Z',
      },
    ];

    vi.mocked(tenantService.listInvoices).mockResolvedValue(mockInvoices as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantInvoicesSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const link = await screen.findByRole('link', { name: /Visualizar PDF/i });
    expect(link).toHaveAttribute('href', 'https://pdf.url/3');
  });

  test('T35 - trata estado vazio sem notas fiscais', async () => {
    vi.mocked(tenantService.listInvoices).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantInvoicesSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const emptyMsg = await screen.findByText((content, el) => el?.textContent?.trim() === 'Nenhuma nota fiscal encontrada.');
    expect(emptyMsg).toBeDefined();
  });

  test('T36 - trata erro de chamada a listInvoices sem quebrar', async () => {
    vi.mocked(tenantService.listInvoices).mockRejectedValue(new Error('Network error'));

    render(
      <QueryClientProvider client={queryClient}>
        <TenantInvoicesSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const errorMsg = await screen.findByText((content, el) => el?.textContent?.trim() === 'Erro ao carregar notas fiscais.');
    expect(errorMsg).toBeDefined();
  });
});
