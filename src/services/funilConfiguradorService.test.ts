import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { funilConfiguradorService } from './funilConfiguradorService';

vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// funil-configurador-f2 RF-19: rota e corpo que o handler lê.
describe('funilConfiguradorService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê GET /admin/settings/funil-configurador', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({});
    await funilConfiguradorService.obter();
    expect(get).toHaveBeenCalledWith('/admin/settings/funil-configurador');
  });

  it('grava PUT com tenant_real e tenant_teste', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({});
    await funilConfiguradorService.atualizar('t-real', '');
    expect(put).toHaveBeenCalledWith('/admin/settings/funil-configurador', { tenant_real: 't-real', tenant_teste: '' });
  });
});
