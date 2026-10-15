import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LogsPage from './page';
import { tenantService } from '@/services/tenantService';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getSystemErrors: vi.fn().mockResolvedValue([]),
    getLogs: vi.fn().mockResolvedValue([]),
  },
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('LogsPage - filtro de serviço', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inclui Public e Asaas Worker entre as opções de serviço (lambdas do webhook Asaas)', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogsPage />
      </QueryClientProvider>
    );

    expect(screen.getByRole('option', { name: 'Public (Webhooks)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Asaas Worker' })).toBeInTheDocument();
  });

  it('ao selecionar "Public (Webhooks)", consulta o backend com service=Public', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LogsPage />
      </QueryClientProvider>
    );

    const selects = screen.getAllByRole('combobox');
    const serviceSelect = selects[0];
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(serviceSelect, { target: { value: 'Public' } });

    await vi.waitFor(() => {
      expect(tenantService.getSystemErrors).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'Public' })
      );
    });
  });

  it('na fonte de auditoria, mostra a data do registro (created_at do contrato)', async () => {
    const criadoEm = '2026-03-01T12:00:00Z';
    vi.mocked(tenantService.getLogs).mockResolvedValue([
      { tenant_id: 't1', sk: 'AUDIT#1', actor: 'Admin', action: 'TENANT_CREATED', target_id: 't1', ip_address: '127.0.0.1', request_id: 'req-1', expires_at: 0, created_at: criadoEm },
    ]);
    const { fireEvent } = await import('@testing-library/react');

    render(
      <QueryClientProvider client={queryClient}>
        <LogsPage />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Auditoria de Negócio/i }));

    expect(await screen.findByText(new Date(criadoEm).toLocaleString())).toBeInTheDocument();
  });
});
