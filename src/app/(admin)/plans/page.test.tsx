import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlansPage from './page';

// Mocks for services and queries
vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn(),
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
});
