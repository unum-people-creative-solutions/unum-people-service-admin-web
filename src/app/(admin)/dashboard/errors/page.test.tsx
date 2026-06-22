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
});
