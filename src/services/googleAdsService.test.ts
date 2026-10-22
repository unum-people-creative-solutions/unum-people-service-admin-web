import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { googleAdsService } from './googleAdsService';
import { ApiError } from '@/lib/apiError';

// o cliente importa o pool do Cognito, que exige as variáveis de ambiente
vi.mock('@/lib/cognito', () => ({ userPool: {} }));

// google-ads-mcc-configuracoes: o contrato real com a API (rota e corpo), sem mockar o serviço.
describe('googleAdsService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  // google-ads-conectar-no-admin RF-02 (Verifier I1): rota e corpo que o handler lê.
  it('conecta com POST /admin/settings/google-ads/conectar, code e redirect_uri', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    await googleAdsService.conectar('c1', 'https://admin.unumpeople.com.br/settings/google-ads/callback');
    expect(post).toHaveBeenCalledWith('/admin/settings/google-ads/conectar', {
      code: 'c1',
      redirect_uri: 'https://admin.unumpeople.com.br/settings/google-ads/callback',
    });
  });

  it('a recusa do Google (502) chega à tela como ApiError com detalhes.error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'google_recusou' }), { status: 502 })),
    );
    const chamada = googleAdsService.conectar('c1', 'https://admin.unumpeople.com.br/settings/google-ads/callback');
    await expect(chamada).rejects.toBeInstanceOf(ApiError);
    await expect(chamada).rejects.toMatchObject({ status: 502, detalhes: { error: 'google_recusou' } });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/settings\/google-ads\/conectar$/);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(init?.body))).toEqual({
      code: 'c1',
      redirect_uri: 'https://admin.unumpeople.com.br/settings/google-ads/callback',
    });
  });
});
