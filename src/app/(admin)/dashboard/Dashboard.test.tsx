import { render, screen } from '@testing-library/react';
import DashboardPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getStats: vi.fn(),
    getLogs: vi.fn(),
    getSystemErrors: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Dashboard Page Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantService.getStats).mockResolvedValue({
      total_tenants: 10,
      active_tenants: 8,
      blocked_tenants: 2,
      estimated_mrr: 1000,
    });
    vi.mocked(tenantService.getLogs).mockResolvedValue([
      { sk: 'AUDIT#1', created_at: new Date().toISOString(), action: 'TENANT_CREATED', actor: 'Admin', target_id: 'tenant-1' }
    ]);
    vi.mocked(tenantService.getSystemErrors).mockResolvedValue([
      { timestamp: new Date().toISOString(), level: 'ERROR', message: 'Connection Timeout', service: 'api' }
    ]);
  });

  test('verifies combined logs rendering (Audit and System Error)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    );

    // Verifica se ambos os tipos de log estão presentes
    expect(await screen.findByText(/criou o tenant tenant-1/i)).toBeDefined();
    expect(await screen.findByText(/Connection Timeout/i)).toBeDefined();
    
    // Verifica a presença do LED de Erro (span com animate-pulse)
    const errorLed = document.querySelector('.bg-red-500.animate-pulse');
    expect(errorLed).toBeDefined();
    
    // Verifica a tag do serviço do erro
    expect(screen.getByText('api')).toBeDefined();
  });

  test('verifies log container grid span', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    );

    const logHeading = await screen.findByText(/Atividades e Logs Recentes/i);
    // Buscamos o container que deve ter a classe de grid
    const logContainer = logHeading.closest('.space-y-4');
    
    // Agora deve ser lg:col-span-3
    expect(logContainer?.className).toContain('lg:col-span-3');
  });

  test('verifies sidebar widget space removal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    );

    // O div com space-y-6 deve ter sido removido
    const emptyDiv = document.querySelector('.space-y-6');
    expect(emptyDiv).toBeNull();
  });
});
