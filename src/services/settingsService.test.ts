import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { settingsService } from './settingsService';

// Payloads exatamente como a API devolve (modo_teste_handler.go): o apiFetch já
// entrega o JSON do corpo, sem envelope `data`.
const ESTADO_ATIVO = {
  ativo: true,
  token: 't'.repeat(43),
  rotacionado_em: '2026-10-21T13:27:00Z',
  rotacionado_por: 'sub-op',
};
const ROTACAO = { token: 'n'.repeat(43), rotacionado_em: '2026-10-21T14:00:00Z' };

describe('settingsService — modo teste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obterModoTeste chama GET /admin/settings/test-mode e devolve o estado como veio', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.get).mockResolvedValue(ESTADO_ATIVO);

    await expect(settingsService.obterModoTeste()).resolves.toEqual(ESTADO_ATIVO);
    expect(api.get).toHaveBeenCalledWith('/admin/settings/test-mode');
  });

  it('rotacionarModoTeste chama POST /admin/settings/test-mode/rotate e devolve o token novo', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.post).mockResolvedValue(ROTACAO);

    await expect(settingsService.rotacionarModoTeste()).resolves.toEqual(ROTACAO);
    expect(api.post).toHaveBeenCalledWith('/admin/settings/test-mode/rotate');
  });

  it('desligarModoTeste chama DELETE /admin/settings/test-mode', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.delete).mockResolvedValue(undefined);

    await expect(settingsService.desligarModoTeste()).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/admin/settings/test-mode');
  });
});
