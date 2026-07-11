import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TermEditPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 't1' }),
}));

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn(),
    update: vi.fn(),
    publishVersion: vi.fn(),
  }
}));

vi.mock('../_components/VersionHistoryList', () => ({
  VersionHistoryList: ({ term }: { term: { id: string } }) => (
    <div data-testid="version-history-list">Histórico de {term.id}</div>
  ),
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

const term = { id: 't1', name: 'Termo Site', description: 'Escopo do pacote site', is_active: true, current_version: 1 };

describe('TermEditPage', () => {
  it('renderiza as informações do termo e o histórico de versões', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [term], isLoading: false });

    render(<TermEditPage />);

    expect(screen.getByRole('heading', { name: 'Termo Site' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('Termo Site');
    expect(screen.getByLabelText(/Descrição/i)).toHaveValue('Escopo do pacote site');
    expect(screen.getByTestId('version-history-list')).toHaveTextContent('Histórico de t1');
  });

  it('exibe "Termo não encontrado" quando o id não corresponde a nenhum termo', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [], isLoading: false });

    render(<TermEditPage />);

    expect(screen.getByText(/Termo não encontrado/i)).toBeInTheDocument();
  });

  it('salvar informações chama termService.update com os dados do formulário', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [term], isLoading: false });

    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => mutationFn(variables),
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');

    render(<TermEditPage />);

    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: 'Termo Site Atualizado' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar informações/i }));

    await waitFor(() => {
      expect(termService.update).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'Termo Site Atualizado' }));
    });
  });

  it('alterna entre Editor e Preview, renderizando o Markdown no preview', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [term], isLoading: false });

    render(<TermEditPage />);

    fireEvent.change(screen.getByPlaceholderText(/Termo de Contratação de Serviço/i), {
      target: { value: '## Escopo\n\nTexto do termo.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Visualizar Preview/i }));

    expect(screen.getByRole('heading', { name: 'Escopo', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Texto do termo.')).toBeInTheDocument();
  });

  it('publicar versão chama termService.publishVersion com o conteúdo e o changelog', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [term], isLoading: false });

    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => mutationFn(variables),
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');

    render(<TermEditPage />);

    fireEvent.change(screen.getByPlaceholderText(/Termo de Contratação de Serviço/i), { target: { value: '## Termo v2' } });
    fireEvent.change(screen.getByLabelText(/Changelog/i), { target: { value: 'Ajuste de manutenção' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar versão/i }));

    await waitFor(() => {
      expect(termService.publishVersion).toHaveBeenCalledWith('t1', {
        content_md: '## Termo v2',
        changelog: 'Ajuste de manutenção',
      });
    });
  });

  it('erro ao publicar versão é exibido, nunca engolido silenciosamente', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [term], isLoading: false });

    (useMutation as any).mockImplementation(({ onError }: any) => ({
      mutate: () => onError && onError(new Error('Falha ao publicar')),
      isPending: false,
    }));

    render(<TermEditPage />);

    fireEvent.change(screen.getByPlaceholderText(/Termo de Contratação de Serviço/i), { target: { value: '## X' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar versão/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao publicar/i);
  });
});
