import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { PlanConfigFields } from './PlanConfigFields';

const defaultTerms = [{ id: 't1', name: 'Termo Padrão', description: '', is_active: true, current_version: 1 }];

// Wrapper component to provide react-hook-form context
const Wrapper = ({ plansData = { active: [] } as any, terms = defaultTerms as any, defaultValues = {} as any, isEditMode = undefined as boolean | undefined, onSubmit = vi.fn() }) => {
  const methods = useForm({
    defaultValues: {
      plan_id: 'livre',
      documento: '',
      activation_fee: 0,
      monthly_value: 0,
      term_id: terms[0]?.id ?? '',
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <PlanConfigFields plansData={plansData} terms={terms} isEditMode={isEditMode} />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe('PlanConfigFields', () => {
  const mockPlans = {
    active: [
      { slug: 'lp_basico', nome: 'LP Básico', activation_fee: 100, monthly_value: 50, included_services: ['lp'] },
    ],
  };

  it('deve ocultar os campos de pagamento quando o plano for LIVRE', async () => {
    render(<Wrapper defaultValues={{ plan_id: 'livre' }} />);
    
    expect(screen.queryByText(/métodos de pagamento/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /valor de ativação/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /mensalidade/i })).not.toBeInTheDocument();
  });

  it('deve exibir os campos de pagamento e deixá-los read-only quando for plano PAGO (pré-configurado)', async () => {
    render(<Wrapper plansData={mockPlans} defaultValues={{ plan_id: 'lp_basico' }} />);
    
    // O combobox de plano
    const planSelect = screen.getByRole('combobox', { name: /plano/i });
    expect(planSelect).toHaveValue('lp_basico');

    // Em campos do tipo CurrencyInputBR (formatados), geralmente renderiza como textbox
    const activationInput = await screen.findByRole('textbox', { name: /valor de ativação/i });
    const monthlyInput = await screen.findByRole('textbox', { name: /mensalidade/i });

    expect(activationInput).toHaveAttribute('readonly');
    expect(monthlyInput).toHaveAttribute('readonly');
  });

  it('deve permitir edição dos valores de pagamento quando o plano for PERSONALIZADO', async () => {
    render(<Wrapper defaultValues={{ plan_id: 'personalizado' }} />);
    
    const activationInput = await screen.findByRole('textbox', { name: /valor de ativação/i });
    const monthlyInput = await screen.findByRole('textbox', { name: /mensalidade/i });

    expect(activationInput).not.toHaveAttribute('readonly');
    expect(monthlyInput).not.toHaveAttribute('readonly');
  });

  it('deve exigir Documento/CPF quando o plano for pago (ex: personalizado)', async () => {
    render(<Wrapper defaultValues={{ plan_id: 'personalizado' }} />);

    const documentoInput = screen.getByRole('textbox', { name: /documento/i });
    expect(documentoInput).toBeRequired();
  });

  // Achado em produção: CPF/CNPJ inválido só era descoberto quando o Asaas
  // rejeitava a criação do customer com 400 (status genérico, sem nenhum
  // feedback útil ao operador no formulário).
  describe('Documento (CPF/CNPJ): máscara progressiva e validação de dígito verificador', () => {
    it('formata o Documento como CPF/CNPJ enquanto o operador digita', () => {
      render(<Wrapper defaultValues={{ plan_id: 'personalizado' }} />);

      const documentoInput = screen.getByRole('textbox', { name: /documento/i }) as HTMLInputElement;
      fireEvent.change(documentoInput, { target: { value: '12345678909' } });

      expect(documentoInput.value).toBe('123.456.789-09');
    });

    it('exibe erro "CPF/CNPJ inválido" ao submeter com dígito verificador errado', async () => {
      const onSubmit = vi.fn();
      render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'personalizado' }} />);

      const documentoInput = screen.getByRole('textbox', { name: /documento/i });
      fireEvent.change(documentoInput, { target: { value: '111.111.111-11' } });

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      expect(await screen.findByText(/cpf\/cnpj inválido/i)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('não exibe erro de validade ao submeter com um CPF válido', async () => {
      const onSubmit = vi.fn();
      render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'personalizado', activation_fee: 100, monthly_value: 50 }} />);

      const documentoInput = screen.getByRole('textbox', { name: /documento/i });
      fireEvent.change(documentoInput, { target: { value: '12345678909' } });

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
      expect(screen.queryByText(/cpf\/cnpj inválido/i)).toBeNull();
    });

    it('não valida o Documento quando o plano for LIVRE (campo não exigido)', async () => {
      const onSubmit = vi.fn();
      render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'livre', documento: '' }} />);

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
      expect(screen.queryByText(/cpf\/cnpj inválido/i)).toBeNull();
    });
  });

  // T08 — Atribuição ao tenant: ciclo read-only para pago, editável para personalizado
  const mockPlansWithAnnual = {
    active: [
      { slug: 'lp_basico', nome: 'LP Básico', activation_fee: 100, monthly_value: 50, included_services: ['lp'], cycle: 'anual' },
    ],
  };

  it('deve desabilitar o select plan_cycle e fixar seu valor no cycle do plano quando o plano selecionado for PAGO', async () => {
    render(<Wrapper plansData={mockPlansWithAnnual} defaultValues={{ plan_id: 'lp_basico', plan_cycle: 'mensal' }} />);

    const cycleSelect = await screen.findByLabelText('Ciclo') as HTMLSelectElement;

    expect(cycleSelect).toBeDisabled();
    await waitFor(() => {
      expect(cycleSelect.value).toBe('anual');
    });
  });

  it('deve manter o select plan_cycle habilitado quando o plano selecionado for PERSONALIZADO', async () => {
    render(<Wrapper defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal' }} />);

    const cycleSelect = await screen.findByLabelText('Ciclo') as HTMLSelectElement;

    expect(cycleSelect).not.toBeDisabled();
  });

  it('deve ocultar a Mensalidade quando o plano PAGO selecionado tiver cycle anual', async () => {
    render(<Wrapper plansData={mockPlansWithAnnual} defaultValues={{ plan_id: 'lp_basico' }} />);

    await waitFor(() => {
      expect(screen.queryByLabelText('Mensalidade')).not.toBeInTheDocument();
    });
  });

  it('deve ocultar a Mensalidade quando o plano PERSONALIZADO tiver Ciclo anual selecionado manualmente', async () => {
    render(<Wrapper defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal' }} />);

    const cycleSelect = await screen.findByLabelText('Ciclo') as HTMLSelectElement;
    fireEvent.change(cycleSelect, { target: { value: 'anual' } });

    await waitFor(() => {
      expect(screen.queryByLabelText('Mensalidade')).not.toBeInTheDocument();
    });
  });

  // Achado no /local-review da Fase 5 (D-CY-2/BUG-05/07 reintroduzido): ocultar
  // o campo no DOM não basta — o valor precisa ser zerado no form state,
  // senão o payload enviado ainda carrega o monthly_value antigo.
  it('deve zerar monthly_value no form state (não só ocultar) quando o plano PERSONALIZADO mudar para Ciclo anual', async () => {
    const onSubmit = vi.fn();
    render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal', monthly_value: 150, documento: '12345678909' }} />);

    const cycleSelect = await screen.findByLabelText('Ciclo') as HTMLSelectElement;
    fireEvent.change(cycleSelect, { target: { value: 'anual' } });

    await waitFor(() => {
      expect(screen.queryByLabelText('Mensalidade')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submittedData = onSubmit.mock.calls[0][0];
    expect(submittedData.monthly_value).toBe(0);
  });

  // Achado: no plano anual o backend cria UMA assinatura YEARLY usando o
  // BillingType de activation_billing_type (tenant_service.go:251) — nunca lê
  // subscription_billing_type na criação (só relevante para o ciclo mensal,
  // que tem ativação + assinatura recorrente separadas). Mostrar os dois
  // selects no anual é enganoso: o de "Assinatura" não tem efeito nenhum.
  describe('Ciclo anual na criação: só "Método de Pagamento da Ativação" é usado pelo backend', () => {
    it('deve ocultar o Método de Pagamento da Assinatura quando o plano PAGO selecionado tiver ciclo anual', async () => {
      render(<Wrapper plansData={mockPlansWithAnnual} defaultValues={{ plan_id: 'lp_basico' }} />);

      await waitFor(() => {
        expect(screen.queryByRole('combobox', { name: /método de pagamento da assinatura/i })).not.toBeInTheDocument();
      });
      expect(screen.getByRole('combobox', { name: /método de pagamento da ativação/i })).toBeInTheDocument();
    });

    it('deve ocultar o Método de Pagamento da Assinatura quando o plano PERSONALIZADO tiver Ciclo anual selecionado manualmente', async () => {
      render(<Wrapper defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal' }} />);

      expect(screen.getByRole('combobox', { name: /método de pagamento da assinatura/i })).toBeInTheDocument();

      const cycleSelect = await screen.findByLabelText('Ciclo') as HTMLSelectElement;
      fireEvent.change(cycleSelect, { target: { value: 'anual' } });

      await waitFor(() => {
        expect(screen.queryByRole('combobox', { name: /método de pagamento da assinatura/i })).not.toBeInTheDocument();
      });
    });

    it('deve manter visível o Método de Pagamento da Assinatura no ciclo mensal (campo usado pela assinatura recorrente)', async () => {
      render(<Wrapper defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal' }} />);

      expect(screen.getByRole('combobox', { name: /método de pagamento da assinatura/i })).toBeInTheDocument();
    });

    it('em modo de edição, mantém o Método de Pagamento da Assinatura visível mesmo com ciclo anual (campo usado por UpdateSubscriptionBillingType, independente do ciclo original)', async () => {
      render(<Wrapper isEditMode plansData={mockPlansWithAnnual} defaultValues={{ plan_id: 'lp_basico' }} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /método de pagamento da assinatura/i })).toBeInTheDocument();
      });
    });
  });

  // RF-CY-17 (spec.md §7) — regras visuais de modo de edição. Achado no
  // /local-review da Fase 5: a prop isEditMode nunca existiu no componente.
  describe('RF-CY-17 — regras visuais de edição (isEditMode)', () => {
    it('em modo de edição, oculta o Método de Pagamento da Ativação (ação de onboarding, não se aplica a tenant já ativo)', async () => {
      render(<Wrapper isEditMode defaultValues={{ plan_id: 'personalizado' }} />);

      await screen.findByLabelText('Ciclo');
      expect(screen.queryByRole('combobox', { name: /método de pagamento da ativação/i })).not.toBeInTheDocument();
      // O método de pagamento da assinatura continua editável (RF-CY-12/13).
      expect(screen.getByRole('combobox', { name: /método de pagamento da assinatura/i })).toBeInTheDocument();
    });

    it('em modo de edição com ciclo mensal, oculta o Valor de Ativação (não gera nova cobrança)', async () => {
      render(<Wrapper isEditMode defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal' }} />);

      await screen.findByLabelText('Ciclo');
      expect(screen.queryByLabelText('Valor de Ativação')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Valor da Assinatura Anual')).not.toBeInTheDocument();
    });

    it('em modo de edição com ciclo anual, exibe o mesmo campo relabelado como "Valor da Assinatura Anual"', async () => {
      render(<Wrapper isEditMode defaultValues={{ plan_id: 'personalizado', plan_cycle: 'mensal' }} />);

      const cycleSelect = await screen.findByLabelText('Ciclo') as HTMLSelectElement;
      fireEvent.change(cycleSelect, { target: { value: 'anual' } });

      await waitFor(() => {
        expect(screen.queryByLabelText('Valor de Ativação')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Valor da Assinatura Anual')).toBeInTheDocument();
      });
    });

    it('fora do modo de edição (isEditMode ausente, tela de criação), mantém o comportamento anterior', async () => {
      render(<Wrapper defaultValues={{ plan_id: 'personalizado' }} />);

      await screen.findByLabelText('Ciclo');
      expect(screen.getByRole('combobox', { name: /método de pagamento da ativação/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Valor de Ativação')).toBeInTheDocument();
    });
  });

  // TASK-FE-005 — select condicional de Termo de Contratação
  describe('Termo de Contratação (Personalizado/Livre exigem seleção manual)', () => {
    it('exibe o select de Termo quando o plano for Personalizado', () => {
      render(<Wrapper defaultValues={{ plan_id: 'personalizado' }} />);
      expect(screen.getByLabelText(/Termo de Contratação/i)).toBeInTheDocument();
    });

    it('exibe o select de Termo quando o plano for Livre', () => {
      render(<Wrapper defaultValues={{ plan_id: 'livre' }} />);
      expect(screen.getByLabelText(/Termo de Contratação/i)).toBeInTheDocument();
    });

    it('não exibe o select de Termo quando o plano for Pago (vem implícito do Plano)', () => {
      render(<Wrapper plansData={mockPlans} defaultValues={{ plan_id: 'lp_basico' }} />);
      expect(screen.queryByLabelText(/Termo de Contratação/i)).not.toBeInTheDocument();
    });

    it('lista só termos ativos no select', () => {
      const terms = [
        { id: 't1', name: 'Termo Ativo', description: '', is_active: true, current_version: 1 },
        { id: 't2', name: 'Termo Inativo', description: '', is_active: false, current_version: 1 },
      ];
      render(<Wrapper terms={terms} defaultValues={{ plan_id: 'personalizado', term_id: 't1' }} />);
      expect(screen.getByRole('option', { name: 'Termo Ativo' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Termo Inativo' })).not.toBeInTheDocument();
    });

    it('bloqueia submissão sem selecionar termo quando o plano for Personalizado', async () => {
      const onSubmit = vi.fn();
      render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'personalizado', term_id: '', documento: '12345678909', activation_fee: 100, monthly_value: 50 }} />);

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/Selecione um termo de contratação/i)).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('bloqueia submissão sem selecionar termo quando o plano for Livre', async () => {
      const onSubmit = vi.fn();
      render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'livre', term_id: '' }} />);

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/Selecione um termo de contratação/i)).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('envia o term_id selecionado no submit quando o plano for Personalizado', async () => {
      const onSubmit = vi.fn();
      render(<Wrapper onSubmit={onSubmit} defaultValues={{ plan_id: 'personalizado', documento: '12345678909', activation_fee: 100, monthly_value: 50 }} />);

      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
      expect(onSubmit.mock.calls[0][0].term_id).toBe('t1');
    });
  });
});
