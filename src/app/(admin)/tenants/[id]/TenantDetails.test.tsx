import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  },
}));

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({
      active: [{ slug: 'lp_basico', nome: 'LP Básico', monthly_value: 199, activation_fee: 0, included_services: ['site', 'blog'] }],
      inactive: [{ slug: 'plano-desativado-legacy', nome: 'Plano Legacy', included_services: ['crm'] }]
    }),
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

describe('TenantDetailsPage - Refactor Requirements', () => {
  beforeEach(() => {
    queryClient.clear();
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

  test('[RF-TT-03] não deve renderizar o checkbox "Tenant de teste" na tela de edição (flag imutável após criação)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await screen.findByDisplayValue('SAUDE');
    expect(screen.queryByRole('checkbox', { name: /tenant de teste/i })).toBeNull();
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
    vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado' } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
    fireEvent.click(showActionsBtn);

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

  test('deve exibir aviso crítico ao habilitar Hard Delete dentro do modal de confirmação (tenant de teste)', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado', is_test_tenant: true } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
    fireEvent.click(showActionsBtn);

    // O toggle de exclusão física não deve existir fora do modal de confirmação
    expect(screen.queryByLabelText(/Hard Delete/i)).toBeNull();

    const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
    fireEvent.click(deleteBtn);

    // Modal deve aparecer, e o toggle agora vive dentro dele
    expect(await screen.findByText(/Confirmar Exclusão Lógica/i)).toBeDefined();

    const hardDeleteSwitch = await screen.findByLabelText(/Hard Delete/i);
    expect(hardDeleteSwitch).not.toBeDisabled();
    fireEvent.click(hardDeleteSwitch);

    // Deve mostrar aviso de que a exclusão é física e imediata
    expect(await screen.findByText(/exclusão física imediata ativada/i)).toBeDefined();

    // O cabeçalho do modal deve refletir o modo físico
    expect(await screen.findByText(/Confirmar Exclusão Física/i)).toBeDefined();
  });

  describe('[Achado] "Modo Exclusão Física" bloqueado para tenant real; área separada de tenant de teste removida (redundante)', () => {
    test('switch fica desabilitado/bloqueado para tenant real, com texto explicativo no espaço reservado', async () => {
      vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado', is_test_tenant: false } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);

      const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
      fireEvent.click(deleteBtn);

      const hardDeleteSwitch = await screen.findByLabelText(/Hard Delete/i);
      expect(hardDeleteSwitch).toBeDisabled();
      expect(hardDeleteSwitch).not.toBeChecked();

      expect(await screen.findByText(/disponível apenas para tenants de teste/i)).toBeInTheDocument();
      expect(screen.queryByText(/exclusão física imediata ativada/i)).toBeNull();
    });

    test('switch fica habilitado para tenant de teste; texto do espaço reservado muda ao ativar/desativar', async () => {
      vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado', is_test_tenant: true } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);

      const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
      fireEvent.click(deleteBtn);

      const hardDeleteSwitch = await screen.findByLabelText(/Hard Delete/i);
      expect(hardDeleteSwitch).not.toBeDisabled();

      // Antes de ativar: texto informativo, não o alerta forte
      expect(await screen.findByText(/ative para excluir definitivamente agora/i)).toBeInTheDocument();
      expect(screen.queryByText(/exclusão física imediata ativada/i)).toBeNull();

      fireEvent.click(hardDeleteSwitch);
      expect(hardDeleteSwitch).toBeChecked();
      expect(await screen.findByText(/exclusão física imediata ativada/i)).toBeInTheDocument();
    });

    test('a área separada "Excluir definitivamente agora" não existe mais, nem para tenant de teste', async () => {
      vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado', is_test_tenant: true } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);

      const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
      fireEvent.click(deleteBtn);

      await screen.findByText(/Confirmar Exclusão Lógica/i);
      expect(screen.queryByRole('button', { name: /excluir definitivamente agora/i })).toBeNull();
      expect(screen.queryByPlaceholderText(/excluir tenant de teste/i)).toBeNull();
    });

    test('tenant de teste com switch ativo chama tenantService.delete com immediate=true ao confirmar', async () => {
      vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado', is_test_tenant: true } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);

      const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
      fireEvent.click(deleteBtn);

      const hardDeleteSwitch = await screen.findByLabelText(/Hard Delete/i);
      fireEvent.click(hardDeleteSwitch);

      const confirmBtn = screen.getByRole('button', { name: /confirmar exclusão/i });
      const input = screen.getByPlaceholderText(/digite "excluir tenant"/i);
      fireEvent.change(input, { target: { value: 'excluir tenant' } });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(tenantService.delete).toHaveBeenCalledWith('tenant-123', true);
      });
    });
  });

  test('[Achado] ao cancelar o modal de exclusão, o "Modo Exclusão Física" volta à posição original ao reabrir', async () => {
    vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'cancelado' } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
    fireEvent.click(showActionsBtn);

    const deleteBtn = await screen.findByRole('button', { name: /excluir tenant/i });
    fireEvent.click(deleteBtn);

    const hardDeleteSwitch = await screen.findByLabelText(/Hard Delete/i);
    fireEvent.click(hardDeleteSwitch);
    expect(hardDeleteSwitch).toBeChecked();

    const cancelBtn = screen.getByRole('button', { name: /^cancelar$/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText(/Confirmar Exclusão (Lógica|Física)/i)).toBeNull();

    fireEvent.click(deleteBtn);
    const reopenedSwitch = await screen.findByLabelText(/Hard Delete/i);
    expect(reopenedSwitch).not.toBeChecked();
    expect(await screen.findByText(/Confirmar Exclusão Lógica/i)).toBeDefined();
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

  test('não deve exibir o botão de Resetar Senha Admin na Danger Zone', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
    fireEvent.click(showActionsBtn);

    const resetBtn = screen.queryByRole('button', { name: /Resetar Senha Admin/i });
    expect(resetBtn).toBeNull();
  });

  test('deve preservar o plano desativado ao editar outro campo (T11)', async () => {
    // Mock the tenant with a disabled plan
    const tenantWithDisabledPlan = { ...mockTenant, plan_id: 'plano-desativado-legacy' };
    vi.mocked(tenantService.getById).mockResolvedValue(tenantWithDisabledPlan as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    // Wait for the page to load the disabled plan ID in a select/combobox
    // Ensure the combobox value doesn't force a change to an active plan
    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    expect(planSelect).toHaveValue('plano-desativado-legacy');

    // Edit the tenant's name
    const nameInput = screen.getByDisplayValue('Empresa Teste');
    fireEvent.change(nameInput, { target: { value: 'Novo Nome T11' } });

    // Submit changes
    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveBtn);

    // Assert that the update call includes the original disabled plan_id
    await waitFor(() => {
      expect(tenantService.update).toHaveBeenCalledWith('tenant-123', expect.objectContaining({
        nome_negocio: 'Novo Nome T11',
        plan_id: 'plano-desativado-legacy'
      }));
    });
  });

  test('ao selecionar um plano pré-configurado, preenche os serviços automaticamente a partir do plano', async () => {
    const tenantPersonalizado = { ...mockTenant, plan_id: 'personalizado', enabled_services: ['crm'] };
    vi.mocked(tenantService.getById).mockResolvedValue(tenantPersonalizado as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'lp_basico' } });

    // included_services do plano "lp_basico" no mock: ['site', 'blog']
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /^site$/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /^blog$/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /^crm$/i })).not.toBeChecked();
    });
  });

  test('desabilita os checkboxes de serviços quando o plano selecionado é pré-configurado', async () => {
    const tenantComPlanoReal = { ...mockTenant, plan_id: 'lp_basico' };
    vi.mocked(tenantService.getById).mockResolvedValue(tenantComPlanoReal as any);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await screen.findByRole('combobox', { name: /plano/i });
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /^site$/i })).toBeDisabled();
    });
  });

  test('mantém os checkboxes de serviços editáveis para planos Livre e Personalizado', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    fireEvent.change(planSelect, { target: { value: 'personalizado' } });

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /^site$/i })).not.toBeDisabled();
    });
  });

  test('não deve exibir o dropdown legado de Status no card de Assinatura (substituído pelo badge no topo)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    await screen.findByRole('combobox', { name: /plano/i });

    // O badge de status real (tenant.status) continua sendo a única fonte exibida.
    expect(screen.queryByText('Em Atraso')).toBeNull();
    expect(screen.queryByRole('combobox', { name: /^status$/i })).toBeNull();
  });

  test('deve manter o plano selecionado quando a lista de planos carrega depois do tenant (race condition)', async () => {
    const tenantWithRealPlan = { ...mockTenant, plan_id: 'lp_basico' };
    vi.mocked(tenantService.getById).mockResolvedValue(tenantWithRealPlan as any);

    // Simula listPlans resolvendo DEPOIS do tenant (cenário real: a contagem de
    // tenants por plano em listPlans é mais lenta que o GetItem do tenant).
    const { planService } = await import('@/services/planService');
    let resolveListPlans: (value: any) => void;
    vi.mocked(planService.listPlans).mockImplementation(
      () => new Promise((resolve) => { resolveListPlans = resolve; })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TenantDetailsPage />
      </QueryClientProvider>
    );

    // Antes do plansData carregar: a option de fallback já deve refletir o plano correto.
    const planSelect = await screen.findByRole('combobox', { name: /plano/i });
    await waitFor(() => expect(planSelect).toHaveValue('lp_basico'));

    // Agora resolve listPlans - isso troca a option de fallback pela option "real"
    // dentro do optgroup, o que é exatamente o gatilho do bug (reset visual pra "Livre").
    resolveListPlans!({ active: [{ slug: 'lp_basico', nome: 'LP Básico' }], inactive: [] });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'LP Básico' })).toBeInTheDocument();
    });

    // O plano selecionado deve permanecer o mesmo, não resetar para "Livre".
    expect(planSelect).toHaveValue('lp_basico');
  });

  describe('T19 - Badge reflete status real', () => {
    const statusesAndLabels = [
      { status: 'aguardando_ativacao', label: 'AGUARDANDO ATIVAÇÃO' },
      { status: 'pendente_asaas', label: 'PENDENTE ASAAS' },
      { status: 'ativo', label: 'ATIVO' },
      { status: 'inadimplente', label: 'INADIMPLENTE' },
      { status: 'suspenso', label: 'SUSPENSO' },
      { status: 'pausado', label: 'PAUSADO' },
      { status: 'cancelado', label: 'CANCELADO' },
    ];

    statusesAndLabels.forEach(({ status, label }) => {
      test(`deve exibir o badge "${label}" quando status for "${status}"`, async () => {
        vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status } as any);

        render(
          <QueryClientProvider client={queryClient}>
            <TenantDetailsPage />
          </QueryClientProvider>
        );

        // O cabeçalho (que está dentro de h1 ou no topo) deve conter o badge
        // Test fails se o texto exato não for encontrado
        expect(await screen.findByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('[TASK-FE-004] Tempo no estado', () => {
    const statuses = ['inadimplente', 'suspenso', 'pausado'];

    statuses.forEach((status) => {
      test(`deve exibir há quantos dias está no estado quando status for "${status}" e delinquency_since existir`, async () => {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        
        vi.mocked(tenantService.getById).mockResolvedValue({ 
          ...mockTenant, 
          status,
          delinquency_since: fiveDaysAgo.toISOString() 
        } as any);

        render(
          <QueryClientProvider client={queryClient}>
            <TenantDetailsPage />
          </QueryClientProvider>
        );

        expect(await screen.findByText(/há \d+ dias/i)).toBeInTheDocument();
      });
    });

    test('não deve quebrar ou exibir tempo no estado se delinquency_since não existir', async () => {
      vi.mocked(tenantService.getById).mockResolvedValue({ 
        ...mockTenant, 
        status: 'inadimplente',
        delinquency_since: undefined 
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      expect(await screen.findByDisplayValue('Empresa Teste')).toBeInTheDocument();
      expect(screen.queryByText(/há \d+ dias/i)).toBeNull();
    });
  });

  describe('T11 e T12 - Paridade da Edição com a Criação', () => {
    test('ao mudar para plano PAGO (pré-configurado), valores ficam read-only e CPF obrigatório', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const planSelect = await screen.findByRole('combobox', { name: /plano/i });
      fireEvent.change(planSelect, { target: { value: 'lp_basico' } }); // Um plano pago

      await waitFor(() => {
        // Mensalidade deve estar na tela e read-only.
        const monthlyInput = screen.getByRole('textbox', { name: /mensalidade/i });
        expect(monthlyInput).toHaveAttribute('readonly');

        // RF-CY-17: em modo de edição (tenant já ativo), "Valor de Ativação"
        // fica oculto para ciclo mensal — é evento único de onboarding, não
        // se aplica a um tenant que já passou pela ativação.
        expect(screen.queryByLabelText('Valor de Ativação')).not.toBeInTheDocument();

        // Documento deve ser obrigatório
        const docInput = screen.getByRole('textbox', { name: /documento/i });
        expect(docInput).toBeRequired();
      });
    });

    test('ao mudar para plano LIVRE, métodos de pagamento são ocultados', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const planSelect = await screen.findByRole('combobox', { name: /plano/i });
      fireEvent.change(planSelect, { target: { value: 'livre' } });

      await waitFor(() => {
        expect(screen.queryByText(/métodos de pagamento/i)).toBeNull();
        expect(screen.queryByRole('combobox', { name: /método de pagamento da ativação/i })).toBeNull();
        expect(screen.queryByRole('combobox', { name: /método de pagamento da assinatura/i })).toBeNull();
      });
    });
  });

  describe('[Achado /local-review Fase 5] RF-CY-12 — Troca de método de pagamento da assinatura via endpoint dedicado', () => {
    test('ao editar apenas o Método de Pagamento da Assinatura (sem trocar de plano), chama tenantService.updateBillingMethod e não envia o campo pelo PATCH genérico', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const billingSelect = await screen.findByRole('combobox', { name: /método de pagamento da assinatura/i });
      fireEvent.change(billingSelect, { target: { value: 'credit_card' } });

      const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(tenantService.updateBillingMethod).toHaveBeenCalledWith('tenant-123', 'credit_card');
      });

      const updateCalls = (tenantService.update as any).mock.calls;
      updateCalls.forEach((call: any[]) => {
        expect(call[1]).not.toHaveProperty('subscription_billing_type');
      });
    });
  });

  describe('[TASK-FE-003] Troca de Plano com Confirmação', () => {
    test('deve exibir modal de confirmação antes de chamar tenantService.changePlan ao salvar alteração de plano', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );

      const planSelect = await screen.findByRole('combobox', { name: /plano/i });
      // Change to a different plan
      fireEvent.change(planSelect, { target: { value: 'livre' } });

      const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
      fireEvent.click(saveBtn);

      // Modal OBRIGATORIAMENTE aparece (Q-PC-4)
      const modalTitle = await screen.findByText(/Confirmar Troca de Plano/i);
      expect(modalTitle).toBeInTheDocument();

      // Garantir que a requisição ainda NÃO foi feita
      expect(tenantService.changePlan).not.toHaveBeenCalled();

      // Confirma no modal
      const confirmChangeBtn = screen.getByRole('button', { name: /confirmar troca/i });
      fireEvent.click(confirmChangeBtn);

      // Agora a requisição DEVE ser feita
      await waitFor(() => {
        expect(tenantService.changePlan).toHaveBeenCalledWith('tenant-123', expect.objectContaining({
          plan_id: 'livre',
          plan_type: 'livre'
        }));
      });
    });
  });

  describe('[TASK-FE-003 e TASK-FE-004] Danger Zone (T10, T11, T12, T13)', () => {
    test('T10 — UI: "Pausar Assinatura" sai do BillingCard, entra na Área de Perigo', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );
      
      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);
      
      const billingCard = await screen.findByTestId('billing-card');
      expect(within(billingCard).queryByRole('button', { name: /pausar assinatura/i })).toBeNull();
      expect(within(billingCard).queryByRole('button', { name: /cancelar contrato/i })).toBeNull();
      
      const pausarBtn = await screen.findByRole('button', { name: /pausar assinatura/i });
      const cancelarContratoBtn = await screen.findByRole('button', { name: /cancelar contrato/i });
      
      expect(pausarBtn).toBeInTheDocument();
      expect(cancelarContratoBtn).toBeInTheDocument();
    });

    test('T11 — UI: "Cancelar Contrato" exige frase digitada', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );
      
      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);
      
      const cancelarContratoBtn = await screen.findByRole('button', { name: /cancelar contrato/i });
      fireEvent.click(cancelarContratoBtn);
      
      const modalHeading = await screen.findByRole('heading', { name: /cancelar contrato/i });
      expect(modalHeading).toBeInTheDocument();
      
      const confirmBtn = screen.getByRole('button', { name: /confirmar/i });
      expect(confirmBtn).toBeDisabled();
      
      const input = screen.getByPlaceholderText(/digite "cancelar contrato"/i);
      fireEvent.change(input, { target: { value: 'cancelar contrato' } });
      
      expect(confirmBtn).not.toBeDisabled();
    });

    test('T12 — UI: "Excluir Tenant" desabilitado fora de CANCELADO', async () => {
      vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'ativo' } as any);
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );
      
      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);
      
      const excluirBtn = await screen.findByRole('button', { name: /excluir tenant/i });
      expect(excluirBtn).toBeDisabled();
      
      const alertMsg = screen.getByText(/apenas tenants com status CANCELADO podem ser excluídos/i);
      expect(alertMsg).toBeInTheDocument();
    });

    // RF-TT-07 (área separada "Excluir definitivamente agora") foi removida —
    // ver describe "[Achado] Modo Exclusão Física bloqueado..." no topo do
    // arquivo: o mesmo resultado (immediate=true para tenant de teste) agora
    // é alcançado só pelo switch + botão primário "Confirmar Exclusão".

    describe('[Bug reportado] tenant.status vem em MAIÚSCULAS do backend (enum TenantStatus), mas a UI comparava contra strings minúsculas', () => {
      test('com status real "CANCELADO", habilita "Excluir Tenant" e oculta Pausar/Cancelar Contrato', async () => {
        vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'CANCELADO' } as any);

        render(
          <QueryClientProvider client={queryClient}>
            <TenantDetailsPage />
          </QueryClientProvider>
        );

        const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
        fireEvent.click(showActionsBtn);

        const excluirBtn = await screen.findByRole('button', { name: /excluir tenant/i });
        expect(excluirBtn).not.toBeDisabled();
        expect(screen.queryByText(/apenas tenants com status CANCELADO podem ser excluídos/i)).toBeNull();

        expect(screen.queryByRole('button', { name: /pausar assinatura/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /cancelar contrato/i })).toBeNull();
      });

      test('com status real "ATIVO", mantém "Excluir Tenant" desabilitado e exibe Pausar Assinatura / Cancelar Contrato', async () => {
        vi.mocked(tenantService.getById).mockResolvedValue({ ...mockTenant, status: 'ATIVO' } as any);

        render(
          <QueryClientProvider client={queryClient}>
            <TenantDetailsPage />
          </QueryClientProvider>
        );

        const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
        fireEvent.click(showActionsBtn);

        const excluirBtn = await screen.findByRole('button', { name: /excluir tenant/i });
        expect(excluirBtn).toBeDisabled();

        expect(screen.getByRole('button', { name: /pausar assinatura/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancelar contrato/i })).toBeInTheDocument();
      });
    });

    test('T13 — UI: "Bloquear Tenant" exige confirmação leve', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TenantDetailsPage />
        </QueryClientProvider>
      );
      
      const showActionsBtn = await screen.findByRole('button', { name: /mostrar ações/i });
      fireEvent.click(showActionsBtn);
      
      const bloquearSwitch = await screen.findByRole('switch', { name: /bloquear tenant/i });
      fireEvent.click(bloquearSwitch);
      
      const modalHeading = await screen.findByRole('heading', { name: /confirmar bloqueio/i });
      expect(modalHeading).toBeInTheDocument();
      
      const cancelDialogBtn = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelDialogBtn);
      
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /confirmar bloqueio/i })).not.toBeInTheDocument();
      });
    });
  });
});
