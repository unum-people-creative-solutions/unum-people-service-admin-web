import { render, screen } from '@testing-library/react';
import NewTenantPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useRouter } from 'next/navigation';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    create: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('NewTenantPage - Separation of Tenant and Admin', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
  });

  test('deve conter uma seção distinta para Dados do Negócio (Tenant) com badge correspondente', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    const negocioHeading = screen.getByRole('heading', { name: /dados do negócio/i });
    expect(negocioHeading).toBeDefined();

    const negocioBadge = screen.getByText('Negócio');
    expect(negocioBadge).toBeDefined();
  });

  test('deve conter uma seção distinta para Administrador do Tenant com badge correspondente', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    const adminHeading = screen.getByRole('heading', { name: /administrador do tenant/i });
    expect(adminHeading).toBeDefined();

    const adminBadge = screen.getByText('Administrador');
    expect(adminBadge).toBeDefined();
  });

  test('deve incluir o campo opcional de senha temporária para o primeiro usuário administrador', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    const passwordInput = screen.getByLabelText(/senha temporária/i);
    expect(passwordInput).toBeDefined();
    expect(passwordInput).toHaveAttribute('placeholder', 'Unum@123456');
  });
});
