import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { googleAdsService } from './googleAdsService';

// o cliente importa o pool do Cognito, que exige as variáveis de ambiente
vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// google-ads-mcc-configuracoes: o contrato real com a API (rota e corpo), sem mockar o serviço.
describe('googleAdsService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê GET /admin/settings/google-ads', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ conectado: false });
    await googleAdsService.obter();
    expect(get).toHaveBeenCalledWith('/admin/settings/google-ads');
  });

  it('grava PUT com mcc_customer_id', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({});
    await googleAdsService.atualizarMcc('631-981-8479');
    expect(put).toHaveBeenCalledWith('/admin/settings/google-ads', { mcc_customer_id: '631-981-8479' });
  });
});
