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
});
