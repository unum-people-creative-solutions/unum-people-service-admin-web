import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VersionHistoryList } from './VersionHistoryList';

vi.mock('@/services/termService', () => ({
  termService: {
    listVersions: vi.fn(),
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

const term = { id: 'term-1', name: 'Termo Site', description: '', is_active: true, current_version: 2 } as any;

describe('VersionHistoryList', () => {
  it('lista as versões com link para o HTML publicado', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: [
        { term_id: 'term-1', version_number: 1, content_html_url: 'https://cdn.example.com/terms/term-1/v1.html', published_by: 'a@x.com', published_at: '2026-01-01T00:00:00Z', changelog: 'v1' },
        { term_id: 'term-1', version_number: 2, content_html_url: 'https://cdn.example.com/terms/term-1/v2.html', published_by: 'a@x.com', published_at: '2026-02-01T00:00:00Z', changelog: 'v2' },
      ],
      isLoading: false,
    });

    render(<VersionHistoryList term={term} />);

    const link1 = screen.getByRole('link', { name: /v1/i });
    expect(link1).toHaveAttribute('href', 'https://cdn.example.com/terms/term-1/v1.html');
    const link2 = screen.getByRole('link', { name: /v2/i });
    expect(link2).toHaveAttribute('href', 'https://cdn.example.com/terms/term-1/v2.html');
  });

  it('exclui uma versão sem aceites com sucesso', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: [{ term_id: 'term-1', version_number: 1, content_html_url: 'https://cdn/v1.html', published_by: 'a@x.com', published_at: '2026-01-01T00:00:00Z', changelog: '' }],
      isLoading: false,
    });

    const mutateSpy = vi.fn();
    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => {
        mutationFn(variables);
        mutateSpy(variables);
      },
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');

    render(<VersionHistoryList term={term} />);

    screen.getByRole('button', { name: /Excluir v1/i }).click();

    await waitFor(() => {
      expect(termService.deleteVersion).toHaveBeenCalledWith('term-1', 1);
    });
  });

  it('exclusão bloqueada (409) mantém o item na lista e mostra mensagem de erro', async () => {
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: [{ term_id: 'term-1', version_number: 1, content_html_url: 'https://cdn/v1.html', published_by: 'a@x.com', published_at: '2026-01-01T00:00:00Z', changelog: '' }],
      isLoading: false,
    });

    let onErrorCallback: ((err: any) => void) | undefined;
    (useMutation as any).mockImplementation(({ onError }: any) => {
      onErrorCallback = onError;
      return {
        mutate: () => onErrorCallback && onErrorCallback(new Error('term version has active acceptances')),
        isPending: false,
      };
    });

    render(<VersionHistoryList term={term} />);

    screen.getByRole('button', { name: /Excluir v1/i }).click();

    expect(await screen.findByRole('alert')).toHaveTextContent(/não é possível excluir/i);
    // O item continua na lista — a remoção só acontece via refetch em caso de sucesso.
    expect(screen.getByRole('link', { name: /v1/i })).toBeInTheDocument();
  });
});
