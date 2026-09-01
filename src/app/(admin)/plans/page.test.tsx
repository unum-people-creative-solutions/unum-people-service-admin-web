import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlansPage from './page';

// Mocks for services and queries
vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
  }
}));

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn(),
  }
}));

// Mock react-query
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useQuery: vi.fn(),
    useMutation: vi.fn(() => ({ mutate: vi.fn() })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

describe('PlansPage', () => {
  it('renderiza seções de planos Ativos e Desativados', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: {
        active: [{ slug: 'p1', nome: 'Plano 1' }],
        inactive: [{ slug: 'p2', nome: 'Plano 2', tenant_count: 0 }]
      },
      isLoading: false
    });

    render(<PlansPage />);

    expect(screen.getByRole('heading', { name: /Planos Ativos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Planos Desativados/i })).toBeInTheDocument();
  });

  it('botão Excluir deve estar desabilitado se tenant_count > 0', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: {
        active: [],
        inactive: [{ slug: 'promo', nome: 'Promo', tenant_count: 2 }]
      },
      isLoading: false
    });

    render(<PlansPage />);

    const deleteButton = screen.getByRole('button', { name: /Excluir Promo/i });
    expect(deleteButton).toBeDisabled();
  });

  it('botão Excluir habilitado quando tenant_count === 0', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: {
        active: [],
        inactive: [{ slug: 'promo', nome: 'Promo', tenant_count: 0 }]
      },
      isLoading: false
    });

    render(<PlansPage />);

    const deleteButton = screen.getByRole('button', { name: /Excluir Promo/i });
    expect(deleteButton).not.toBeDisabled();
  });

  it('abre o drawer ao clicar em Novo plano', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { active: [], inactive: [] },
      isLoading: false
    });

    render(<PlansPage />);

    const newPlanBtn = screen.getByRole('button', { name: /Novo Plano/i });
    fireEvent.click(newPlanBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Criar Novo Plano/i })).toBeInTheDocument();
  });

  it('clicar em Editar num plano ativo abre o drawer preenchido, sem permitir alterar o slug', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: {
        active: [{
          slug: 'intermediario',
          nome: 'Intermediário',
          descricao: 'Site + Blog',
          activation_fee: 200,
          monthly_value: 149,
          included_services: ['site', 'blog'],
          is_active: true,
        }],
        inactive: []
      },
      isLoading: false
    });

    render(<PlansPage />);

    const editBtn = screen.getByRole('button', { name: /Editar Intermediário/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Editar Plano — Intermediário/i })).toBeInTheDocument();

    const slugInput = screen.getByPlaceholderText(/ex: basico_mensal/i) as HTMLInputElement;
    expect(slugInput.value).toBe('intermediario');
    expect(slugInput).toHaveAttribute('readonly');

    const nomeInput = screen.getByPlaceholderText(/ex: Básico Mensal/i) as HTMLInputElement;
    expect(nomeInput.value).toBe('Intermediário');
  });

  it('o slug fica editável ao abrir o drawer de Novo Plano (não fica preso no modo edição anterior)', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: {
        active: [{
          slug: 'intermediario',
          nome: 'Intermediário',
          activation_fee: 200,
          monthly_value: 149,
          included_services: ['site', 'blog'],
          is_active: true,
        }],
        inactive: []
      },
      isLoading: false
    });

    render(<PlansPage />);

    fireEvent.click(screen.getByRole('button', { name: /Editar Intermediário/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

    expect(screen.getByRole('heading', { name: /Criar Novo Plano/i })).toBeInTheDocument();
    const slugInput = screen.getByPlaceholderText(/ex: basico_mensal/i) as HTMLInputElement;
    expect(slugInput.value).toBe('');
    expect(slugInput).not.toHaveAttribute('readonly');
  });

  // T07 — Tela mestre: campo Ciclo e regra anual (FE)
  it('ao selecionar Ciclo "Anual" o campo Mensalidade desaparece e a Taxa de Adesão é relabelada para "Valor Anual"', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { active: [], inactive: [] },
      isLoading: false
    });

    render(<PlansPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

    const cycleSelect = screen.getByLabelText('Ciclo') as HTMLSelectElement;
    fireEvent.change(cycleSelect, { target: { value: 'anual' } });

    expect(screen.queryByLabelText('Mensalidade')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Valor Anual')).toBeInTheDocument();
  });

  it('ao submeter o formulário com Ciclo "Anual" o payload enviado a createPlan inclui cycle: "anual"', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'terms') {
        return { data: [{ id: 't1', name: 'Termo Site', is_active: true }], isLoading: false };
      }
      return { data: { active: [], inactive: [] }, isLoading: false };
    });

    const mutateSpy = vi.fn();
    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => {
        mutationFn(variables);
        mutateSpy(variables);
      },
      isPending: false,
    }));

    const { planService } = await import('@/services/planService');

    render(<PlansPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

    fireEvent.change(screen.getByPlaceholderText(/ex: basico_mensal/i), { target: { value: 'plano_anual' } });
    fireEvent.change(screen.getByPlaceholderText(/ex: Básico Mensal/i), { target: { value: 'Plano Anual' } });
    fireEvent.change(screen.getByLabelText('Ciclo'), { target: { value: 'anual' } });
    fireEvent.change(screen.getByLabelText('Valor Anual'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText(/Termo de Contratação/i), { target: { value: 't1' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Plano/i }));

    await waitFor(() => {
      expect(planService.createPlan).toHaveBeenCalled();
    });

    const payload = (planService.createPlan as any).mock.calls[0][0];
    expect(payload.cycle).toBe('anual');
    expect(payload.monthly_value).toBe(0);
  });

  it('ao editar um plano existente com cycle "anual" o select de Ciclo vem pré-selecionado em "Anual"', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: {
        active: [{
          slug: 'anual_premium',
          nome: 'Anual Premium',
          descricao: 'Plano anual',
          activation_fee: 1200,
          monthly_value: 0,
          included_services: ['site'],
          is_active: true,
          cycle: 'anual',
        }],
        inactive: []
      },
      isLoading: false
    });

    render(<PlansPage />);

    fireEvent.click(screen.getByRole('button', { name: /Editar Anual Premium/i }));

    const cycleSelect = screen.getByLabelText('Ciclo') as HTMLSelectElement;
    expect(cycleSelect.value).toBe('anual');
  });

  // TASK-FE-004 — select de Termo de Contratação
  const mockQueriesByKey = (terms: any[]) => async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'terms') {
        return { data: terms, isLoading: false };
      }
      return { data: { active: [], inactive: [] }, isLoading: false };
    });
  };

  it('select de Termo de Contratação lista só termos ativos', async () => {
    await mockQueriesByKey([
      { id: 't1', name: 'Termo Site', is_active: true },
      { id: 't2', name: 'Termo Inativo', is_active: false },
    ])();

    render(<PlansPage />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

    const select = screen.getByLabelText(/Termo de Contratação/i) as HTMLSelectElement;
    expect(screen.getByRole('option', { name: 'Termo Site' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Termo Inativo' })).not.toBeInTheDocument();
  });

  it('bloqueia submissão sem selecionar termo e mostra erro de validação', async () => {
    await mockQueriesByKey([{ id: 't1', name: 'Termo Site', is_active: true }])();

    render(<PlansPage />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

    fireEvent.change(screen.getByPlaceholderText(/ex: basico_mensal/i), { target: { value: 'plano_x' } });
    fireEvent.change(screen.getByPlaceholderText(/ex: Básico Mensal/i), { target: { value: 'Plano X' } });
    fireEvent.change(screen.getByLabelText('Mensalidade'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Taxa de Adesão'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Plano/i }));

    expect(await screen.findByText(/Selecione um termo de contratação/i)).toBeInTheDocument();
  });

  it('envia o term_id selecionado no payload de createPlan', async () => {
    await mockQueriesByKey([{ id: 't1', name: 'Termo Site', is_active: true }])();
    const { useMutation } = await import('@tanstack/react-query');
    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => mutationFn(variables),
      isPending: false,
    }));

    const { planService } = await import('@/services/planService');

    render(<PlansPage />);
    fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

    fireEvent.change(screen.getByPlaceholderText(/ex: basico_mensal/i), { target: { value: 'plano_x' } });
    fireEvent.change(screen.getByPlaceholderText(/ex: Básico Mensal/i), { target: { value: 'Plano X' } });
    fireEvent.change(screen.getByLabelText('Mensalidade'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Taxa de Adesão'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText(/Termo de Contratação/i), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Plano/i }));

    await waitFor(() => {
      expect(planService.createPlan).toHaveBeenCalled();
    });
    const payload = (planService.createPlan as any).mock.calls[0][0];
    expect(payload.term_id).toBe('t1');
  });

  it('editar plano legado sem term_id sinaliza o campo como pendente de preenchimento', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockImplementation((opts: any) => {
      if (opts.queryKey[0] === 'terms') {
        return { data: [{ id: 't1', name: 'Termo Site', is_active: true }], isLoading: false };
      }
      return {
        data: {
          active: [{
            slug: 'legado',
            nome: 'Plano Legado',
            activation_fee: 100,
            monthly_value: 50,
            included_services: ['site'],
            is_active: true,
            cycle: 'mensal',
            // sem term_id — plano criado antes desta feature
          }],
          inactive: [],
        },
        isLoading: false,
      };
    });

    render(<PlansPage />);
    fireEvent.click(screen.getByRole('button', { name: /Editar Plano Legado/i }));

    expect(screen.getByText(/ainda não tem um termo vinculado/i)).toBeInTheDocument();
  });

  // TASK-FE-002 — product e pages_included no formulário (T09 + erro de cota)
  describe('product e pages_included', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('plano legado com product vazio e pages_included 0 abre como Plataforma e salvar sem tocar no campo envia os defaults', async () => {
      const storedPlan = {
        slug: 'legado-produto',
        nome: 'Plano Genuinamente Legado',
        descricao: 'Antes da feature de produto',
        activation_fee: 100,
        monthly_value: 50,
        included_services: ['site'],
        is_active: true,
        cycle: 'mensal' as const,
        term_id: 't1',
        product: '',
        pages_included: 0,
      };

      const { useQuery, useMutation } = await import('@tanstack/react-query');
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === 'terms') {
          return { data: [{ id: 't1', name: 'Termo Site', is_active: true }], isLoading: false };
        }
        return { data: { active: [storedPlan], inactive: [] }, isLoading: false };
      });

      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(
        ({ mutationFn }: { mutationFn: (v: unknown) => void }) => ({
          mutate: (variables: unknown) => mutationFn(variables),
          isPending: false,
        })
      );

      const { planService } = await import('@/services/planService');
      (planService.updatePlan as ReturnType<typeof vi.fn>).mockResolvedValue(storedPlan);

      render(<PlansPage />);
      fireEvent.click(screen.getByRole('button', { name: /Editar Plano Genuinamente Legado/i }));

      const productSelect = screen.getByRole('combobox', { name: /Produto/i }) as HTMLSelectElement;
      expect(productSelect.value).toBe('plataforma');
      expect(screen.getByRole('option', { name: 'Plataforma', selected: true })).toBeInTheDocument();
      expect(screen.queryByRole('spinbutton', { name: /Páginas inclusas/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Salvar Plano/i }));

      await waitFor(() => {
        expect(planService.updatePlan).toHaveBeenCalledWith(
          'legado-produto',
          expect.objectContaining({
            product: 'plataforma',
            pages_included: 0,
          })
        );
      });
    });

    it('salvar e reabrir um plano preserva product e pages_included', async () => {
      const storedPlan = {
        slug: 'lp-basico',
        nome: 'LP Básico',
        descricao: 'Landing page',
        activation_fee: 200,
        monthly_value: 99,
        included_services: ['lp'],
        is_active: true,
        cycle: 'mensal' as const,
        term_id: 't1',
        product: 'landing-page' as const,
        pages_included: 1,
      };

      const { useQuery, useMutation } = await import('@tanstack/react-query');
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === 'terms') {
          return { data: [{ id: 't1', name: 'Termo Site', is_active: true }], isLoading: false };
        }
        return { data: { active: [storedPlan], inactive: [] }, isLoading: false };
      });

      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(
        ({ mutationFn, onSuccess }: { mutationFn: (v: unknown) => void; onSuccess?: () => void }) => ({
          mutate: (variables: { slug?: string; plan?: Record<string, unknown> }) => {
            mutationFn(variables);
            if (variables?.plan) {
              Object.assign(storedPlan, variables.plan);
            }
            onSuccess?.();
          },
          isPending: false,
        })
      );

      const { planService } = await import('@/services/planService');
      (planService.updatePlan as ReturnType<typeof vi.fn>).mockResolvedValue(storedPlan);

      render(<PlansPage />);
      fireEvent.click(screen.getByRole('button', { name: /Editar LP Básico/i }));

      const productSelect = screen.getByRole('combobox', { name: /Produto/i }) as HTMLSelectElement;
      expect(productSelect.value).toBe('landing-page');
      const pagesInput = screen.getByRole('spinbutton', { name: /Páginas inclusas/i }) as HTMLInputElement;
      expect(pagesInput.value).toBe('1');

      fireEvent.change(pagesInput, { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /Salvar Plano/i }));

      await waitFor(() => {
        expect(planService.updatePlan).toHaveBeenCalledWith(
          'lp-basico',
          expect.objectContaining({
            product: 'landing-page',
            pages_included: 3,
          })
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Editar LP Básico/i }));

      expect((screen.getByRole('combobox', { name: /Produto/i }) as HTMLSelectElement).value).toBe('landing-page');
      expect((screen.getByRole('spinbutton', { name: /Páginas inclusas/i }) as HTMLInputElement).value).toBe('3');
    });

    it('erro do backend por cota inválida (400/409) aparece na interface', async () => {
      const backendMessage = 'pages_included deve ser no mínimo 1 para product landing-page';

      const { useQuery, useMutation } = await import('@tanstack/react-query');
      (useQuery as ReturnType<typeof vi.fn>).mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === 'terms') {
          return { data: [{ id: 't1', name: 'Termo Site', is_active: true }], isLoading: false };
        }
        return { data: { active: [], inactive: [] }, isLoading: false };
      });

      (useMutation as ReturnType<typeof vi.fn>).mockImplementation(
        ({ onError }: { onError?: (err: Error) => void }) => ({
          mutate: () => onError?.(new Error(backendMessage)),
          isPending: false,
        })
      );

      render(<PlansPage />);
      fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

      fireEvent.change(screen.getByPlaceholderText(/ex: basico_mensal/i), { target: { value: 'lp_zero' } });
      fireEvent.change(screen.getByPlaceholderText(/ex: Básico Mensal/i), { target: { value: 'LP Zero' } });
      fireEvent.change(screen.getByRole('combobox', { name: /Produto/i }), { target: { value: 'landing-page' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: /Páginas inclusas/i }), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Taxa de Adesão'), { target: { value: '50' } });
      fireEvent.change(screen.getByLabelText('Mensalidade'), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText(/Termo de Contratação/i), { target: { value: 't1' } });
      fireEvent.click(screen.getByRole('button', { name: /Salvar Plano/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(backendMessage);
    });

    it('campo Páginas inclusas só aparece quando o produto é Landing Page', async () => {
      const { useQuery } = await import('@tanstack/react-query');
      (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
        data: { active: [], inactive: [] },
        isLoading: false,
      });

      render(<PlansPage />);
      fireEvent.click(screen.getByRole('button', { name: /Novo Plano/i }));

      expect(screen.queryByRole('spinbutton', { name: /Páginas inclusas/i })).not.toBeInTheDocument();

      fireEvent.change(screen.getByRole('combobox', { name: /Produto/i }), { target: { value: 'landing-page' } });

      expect(screen.getByRole('spinbutton', { name: /Páginas inclusas/i })).toBeInTheDocument();
    });
  });
});
