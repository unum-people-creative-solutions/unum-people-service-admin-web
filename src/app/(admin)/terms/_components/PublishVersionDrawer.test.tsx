import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PublishVersionDrawer } from './PublishVersionDrawer';

vi.mock('@/services/termService', () => ({
  termService: {
    publishVersion: vi.fn(),
  }
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

const term = { id: 'term-1', name: 'Termo Site', description: '', is_active: true, current_version: 1 } as any;

describe('PublishVersionDrawer', () => {
  it('submete o Markdown e o changelog para termService.publishVersion', async () => {
    const { useMutation } = await import('@tanstack/react-query');
    const mutateSpy = vi.fn();
    (useMutation as any).mockImplementation(({ mutationFn }: any) => ({
      mutate: (variables: any) => {
        mutationFn(variables);
        mutateSpy(variables);
      },
      isPending: false,
    }));

    const { termService } = await import('@/services/termService');

    render(<PublishVersionDrawer term={term} open={true} onOpenChange={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Conteúdo \(Markdown\)/i), { target: { value: '# Termo v2' } });
    fireEvent.change(screen.getByLabelText(/Changelog/i), { target: { value: 'Ajuste de manutenção' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar versão/i }));

    await waitFor(() => {
      expect(termService.publishVersion).toHaveBeenCalledWith('term-1', {
        content_md: '# Termo v2',
        changelog: 'Ajuste de manutenção',
      });
    });
  });

  it('erro de API ao publicar é exibido, nunca engolido silenciosamente', async () => {
    const { useMutation } = await import('@tanstack/react-query');
    let onErrorCallback: ((err: any) => void) | undefined;
    (useMutation as any).mockImplementation(({ onError }: any) => {
      onErrorCallback = onError;
      return {
        mutate: () => onErrorCallback && onErrorCallback(new Error('Falha ao publicar')),
        isPending: false,
      };
    });

    render(<PublishVersionDrawer term={term} open={true} onOpenChange={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Conteúdo \(Markdown\)/i), { target: { value: '# X' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar versão/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Falha ao publicar/i);
  });
});
