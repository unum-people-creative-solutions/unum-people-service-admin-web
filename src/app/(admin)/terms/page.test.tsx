import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TermsPage from './page';

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listVersions: vi.fn(),
    publishVersion: vi.fn(),
    deleteVersion: vi.fn(),
  }
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useQuery: vi.fn(),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

describe('TermsPage', () => {
  it('renderiza seções de Termos Ativos e Desativados', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: [
        { id: 't1', name: 'Termo Site', description: 'Escopo do pacote site', is_active: true, current_version: 1 },
        { id: 't2', name: 'Termo Antigo', description: 'Descontinuado', is_active: false, current_version: 3 },
      ],
      isLoading: false,
    });

    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /Termos Ativos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Termos Desativados/i })).toBeInTheDocument();
    expect(screen.getByText('Termo Site')).toBeInTheDocument();
    expect(screen.getByText('Termo Antigo')).toBeInTheDocument();
  });

  it('abre o drawer de criação ao clicar em Novo Termo', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [], isLoading: false });

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Criar Novo Termo/i })).toBeInTheDocument();
  });

  it('submeter o formulário de criação chama termService.create com nome e descrição', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [], isLoading: false });

    const mutateSpy = vi.fn();
    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => {
        mutationFn(variables);
        mutateSpy(variables);
      },
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Termo Pacote Site' } });
    fireEvent.change(screen.getByLabelText(/Descrição/i), { target: { value: 'Escopo do pacote de site' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Termo/i }));

    await waitFor(() => {
      expect(termService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Termo Pacote Site', description: 'Escopo do pacote de site' })
      );
    });
  });

  it('erro de API ao criar termo é exibido, nunca engolido silenciosamente', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [], isLoading: false });

    let onErrorCallback: ((err: any) => void) | undefined;
    (useMutation as any).mockImplementation(({ onError }: any) => {
      onErrorCallback = onError;
      return {
        mutate: () => onErrorCallback && onErrorCallback(new Error('Falha ao criar')),
        isPending: false,
      };
    });

    render(<TermsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Novo Termo/i }));
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar Termo/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao criar/i);
  });
});
