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

describe('NewTenantPage - T20: CPF obrigatório p/ pago + seletores de método (UI-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Deve exigir CPF/CNPJ quando plano é pago e exibir seletores de método de pagamento', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    // Seleciona plano pago
    const planSelect = screen.getByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'plan_mock_1' } });

    // Tenta submeter sem preencher nada
    const submitBtn = screen.getByRole('button', { name: /criar tenant/i });
    fireEvent.click(submitBtn);

    // Deve exibir erro de CPF/CNPJ obrigatório específico
    const cpfError = await screen.findByText(/cpf\/cnpj é obrigatório para planos pagos/i);
    expect(cpfError).toBeInTheDocument();

    // Deve exibir os seletores de método de pagamento (Cartão, Boleto, Pix) para ativação e assinatura
    const paymentMethodHeading = screen.getByRole('heading', { name: /métodos de pagamento/i });
    expect(paymentMethodHeading).toBeInTheDocument();

    // Os seletores de método de pagamento (ativação e assinatura) devem ser campos reais, não só o heading
    const activationMethod = screen.getByRole('combobox', { name: /método de pagamento da ativação/i });
    expect(activationMethod).toBeInTheDocument();
    const subscriptionMethod = screen.getByRole('combobox', { name: /método de pagamento da assinatura/i });
    expect(subscriptionMethod).toBeInTheDocument();
  });

  test('Não deve exibir seletores de pagamento quando plano é livre', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewTenantPage />
      </QueryClientProvider>
    );

    // Seleciona plano livre
    const planSelect = screen.getByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'livre' } });

    // Não deve exibir os seletores de método de pagamento
    const paymentMethodHeading = screen.queryByRole('heading', { name: /métodos de pagamento/i });
    expect(paymentMethodHeading).toBeNull();
    expect(screen.queryByRole('combobox', { name: /método de pagamento da ativação/i })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /método de pagamento da assinatura/i })).toBeNull();
  });
});
