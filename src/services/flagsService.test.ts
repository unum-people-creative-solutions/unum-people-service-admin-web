import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { api } from '@/lib/api';
import { flagsService } from './flagsService';

const flagDemonstracao = {
  chave: 'demonstracao',
  descricao: 'd',
  apps: ['lp-builder'],
  estado: 'teste',
  atualizado_em: '2026-10-21T15:00:00Z',
  atualizado_por: 'sub-op',
};

describe('flagsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista as flags a partir de GET /admin/flags e devolve o array', async () => {
    vi.mocked(api.get).mockResolvedValue({ flags: [flagDemonstracao] });

    await expect(flagsService.listar()).resolves.toEqual([flagDemonstracao]);
    expect(api.get).toHaveBeenCalledWith('/admin/flags');
  });

  it('atualiza o estado da flag e devolve a flag retornada pelo PUT', async () => {
    const flagAtualizada = { ...flagDemonstracao, estado: 'ligada', atualizado_por: 'sub-novo' };
    vi.mocked(api.put).mockResolvedValue(flagAtualizada);

    await expect(flagsService.atualizar('demonstracao', 'ligada')).resolves.toEqual(flagAtualizada);
    expect(api.put).toHaveBeenCalledWith('/admin/flags/demonstracao', { estado: 'ligada' });
  });

  it('codifica a chave com caractere especial ao atualizar', async () => {
    const flagAtualizada = { ...flagDemonstracao, chave: 'a b', estado: 'teste' };
    vi.mocked(api.put).mockResolvedValue(flagAtualizada);

    await expect(flagsService.atualizar('a b', 'teste')).resolves.toEqual(flagAtualizada);
    expect(api.put).toHaveBeenCalledWith('/admin/flags/a%20b', { estado: 'teste' });
  });
});
