import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { PlanConfigFields } from './PlanConfigFields';

// Wrapper component to provide react-hook-form context
const Wrapper = ({ plansData = { active: [] } as any, defaultValues = {} as any }) => {
  const methods = useForm({
    defaultValues: {
      plan_id: 'livre',
      documento: '',
      activation_fee: 0,
      monthly_value: 0,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(vi.fn())}>
        <PlanConfigFields plansData={plansData} />
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

});
