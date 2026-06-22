import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BillingCard } from './BillingCard';
import { Tenant, Contract } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    getById: vi.fn(),
    retryBilling: vi.fn(),
    retryActivation: vi.fn(),
  },
}));

describe('BillingCard Component', () => {
  const baseTenant: Tenant = {
    id: 't-123',
    api_key: 'key',
    nome_negocio: 'Test',
    email_contato: 'test@test.com',
    documento: '123',
    nicho: 'Test',
    use_mcc_auth: false,
    status: 'pendente_asaas',
    plan_id: 'p-1',
    plan_value: 100,
    plan_cycle: 'mensal',
    activated_at: '',
    next_billing_at: '',
    renewal_at: '',
    is_blocked: false,
    created_at: '',
  };

  const createContract = (state: Contract['subscription_url_state']): Contract => ({
    plan_id: 'p-1',
    plan_type: 'pago',
    activation_fee: 0,
    monthly_value: 100,
    subscription_url_state: state,
    subscription_invoice_url: state === 'disponivel' ? 'https://asaas.com/link' : undefined,
    created_at: '',
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('T16 - deve exibir estado "aguardando_ativacao"', () => {
    render(<BillingCard tenant={baseTenant} contract={createContract('aguardando_ativacao')} />);
    expect(screen.getByText(/aguardando ativação|pendente/i)).toBeInTheDocument();
  });

  it('T16 - deve exibir estado "gerando"', () => {
    render(<BillingCard tenant={baseTenant} contract={createContract('gerando')} />);
    expect(screen.getByText(/gerando/i)).toBeInTheDocument();
  });

  it('T16 - deve exibir estado "disponivel" com botão de copiar', () => {
    render(<BillingCard tenant={baseTenant} contract={createContract('disponivel')} />);
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument();
    expect(screen.getByText(/link de pagamento/i)).toBeInTheDocument();
  });

  it('T16 - deve exibir estado "erro"', () => {
    render(<BillingCard tenant={baseTenant} contract={createContract('erro')} />);
    expect(screen.getByText(/erro ao gerar/i)).toBeInTheDocument();
  });

  it('T18 - deve fazer polling (refetch) se o estado for "gerando"', async () => {
    (tenantService.getById as any).mockResolvedValue({
      ...baseTenant,
      contract: createContract('disponivel'),
    });

    render(<BillingCard tenant={baseTenant} contract={createContract('gerando')} />);
    
    expect(tenantService.getById).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(tenantService.getById).toHaveBeenCalledWith('t-123');
  });

  it('T17 - deve exibir botão de tentar novamente e disparar retryBilling se erro', async () => {
    render(<BillingCard tenant={baseTenant} contract={createContract('erro')} />);
    
    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i });
    expect(retryBtn).toBeInTheDocument();

    (tenantService.retryBilling as any).mockResolvedValue({ message: 'ok' });
    
    await act(async () => {
      fireEvent.click(retryBtn);
    });
    
    expect(tenantService.retryBilling).toHaveBeenCalledWith('t-123');
  });

  it('T21 - deve disparar toast/alerta de erro se retryBilling falhar', async () => {
    render(<BillingCard tenant={baseTenant} contract={createContract('erro')} />);

    const retryBtn = screen.getByRole('button', { name: /tentar novamente/i });

    (tenantService.retryBilling as any).mockRejectedValue(new Error('Network Error'));

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('UI-01 - deve exibir o link de ativação copiável quando presente', () => {
    const contract = createContract('aguardando_ativacao');
    contract.activation_invoice_url = 'https://asaas.com/activation-link';
    const awaitingTenant: Tenant = { ...baseTenant, status: 'aguardando_ativacao' };
    render(<BillingCard tenant={awaitingTenant} contract={contract} />);
    expect(screen.getByRole('link', { name: /link de ativação/i })).toHaveAttribute(
      'href',
      'https://asaas.com/activation-link'
    );
  });

  it('UI-06 - tenant PENDENTE_ASAAS exibe aviso e botão "Tentar ativação"', async () => {
    const pendingTenant: Tenant = { ...baseTenant, status: 'pendente_asaas' };
    render(<BillingCard tenant={pendingTenant} contract={undefined} />);

    const retryBtn = screen.getByRole('button', { name: /tentar ativação/i });
    expect(retryBtn).toBeInTheDocument();

    (tenantService.retryActivation as any).mockResolvedValue({ message: 'ok' });

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(tenantService.retryActivation).toHaveBeenCalledWith('t-123');
  });
});
