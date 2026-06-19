import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({ 
      active: [
        { slug: 'plan_mock_1', nome: 'Mock Plan', activation_fee: 100, monthly_value: 50 }
      ], 
      inactive: [] 
    }),
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
  });
});

describe('NewTenantPage - Formulário Adaptativo por Plano (T12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Plano Livre oculta campos de pagamento', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    const planSelect = screen.getByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'livre' } });
    
    const fields = screen.queryByRole('spinbutton', { name: /valor de ativação/i });
    expect(fields).toBeNull();
  });

  test('Plano Personalizado permite edição de valores', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    const planSelect = screen.getByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'personalizado' } });

    const activationField = screen.getByRole('spinbutton', { name: /valor de ativação/i });
    expect(activationField).toBeInTheDocument();
    expect(activationField).not.toHaveAttribute('readonly');
  });

  test('Plano Pré-configurado exibe valores readonly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    const planSelect = screen.getByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'plan_mock_1' } });

    const monthlyField = screen.getByRole('spinbutton', { name: /mensalidade/i });
    expect(monthlyField).toBeInTheDocument();
    expect(monthlyField).toHaveAttribute('readonly');
  });
});
