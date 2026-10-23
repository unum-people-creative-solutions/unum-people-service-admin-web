import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { googleAdsService } from '@/services/googleAdsService';
import { ApiError } from '@/lib/apiError';
import { CHAVE_STATE } from '@/lib/googleAdsOAuth';
import RetornoGoogleAdsPage from './page';

// google-ads-conectar-no-admin T306 (RF-05).
const params = vi.hoisted(() => ({ atual: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => params.atual }));
vi.mock('@/services/googleAdsService', () => ({
  googleAdsService: { obter: vi.fn(), atualizarMcc: vi.fn(), conectar: vi.fn() },
}));

const RETORNO = `${window.location.origin}/settings/google-ads/callback`;
const VISAO = {
  conectado: true,
  email: 'ads@unumpeople.com.br',
  conectado_em: '2026-10-22T18:44:15Z',
  mcc_customer_id: '',
  tenants_usando: 1,
  google_client_id: 'cli',
};

function abrir(query: string, guardado: string | null = 'st-1') {
  params.atual = new URLSearchParams(query);
  sessionStorage.clear();
  if (guardado !== null) sessionStorage.setItem(CHAVE_STATE, guardado);
  return render(
    <StrictMode>
      <RetornoGoogleAdsPage />
    </StrictMode>,
  );
}

const MSG_STATE = 'Não foi possível confirmar que este retorno veio deste navegador. Tente conectar de novo.';

describe('Retorno do Google Ads no admin', () => {
  beforeEach(() => {
    vi.mocked(googleAdsService.conectar).mockReset();
  });

  it('conecta com o código e mostra a conta, uma chamada só', async () => {
    vi.mocked(googleAdsService.conectar).mockResolvedValue(VISAO);
    abrir('code=c1&state=st-1');
    expect(await screen.findByText('Conta Google conectada: ads@unumpeople.com.br.')).toBeInTheDocument();
    expect(googleAdsService.conectar).toHaveBeenCalledTimes(1);
    expect(googleAdsService.conectar).toHaveBeenCalledWith('c1', RETORNO);
    expect(screen.getByRole('link', { name: 'Voltar para Configurações' })).toHaveAttribute('href', '/settings');
    expect(sessionStorage.getItem(CHAVE_STATE)).toBeNull();
  });

  it('conectada sem e-mail não mostra frase quebrada', async () => {
    vi.mocked(googleAdsService.conectar).mockResolvedValue({ ...VISAO, email: '' });
    abrir('code=c1&state=st-1');
    expect(await screen.findByRole('status')).toHaveTextContent(/^Conta Google conectada\.$/);
  });

  it('erro do Google não chama a API', async () => {
    abrir('error=access_denied&state=st-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('O Google não autorizou a conexão.');
    expect(googleAdsService.conectar).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar para Configurações' })).toBeInTheDocument();
  });

  it.each([
    ['state diferente', 'code=c1&state=outro', 'st-1'],
    ['state ausente na volta', 'code=c1', 'st-1'],
    ['nada guardado na sessão', 'code=c1&state=st-1', null],
  ])('%s não chama a API', async (_nome, query, guardado) => {
    abrir(query, guardado);
    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_STATE);
    expect(googleAdsService.conectar).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(CHAVE_STATE)).toBeNull();
  });

  it('recusa do Google na troca mostra o motivo', async () => {
    vi.mocked(googleAdsService.conectar).mockRejectedValue(new ApiError('google_recusou', 502, { error: 'google_recusou' }));
    abrir('code=c1&state=st-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('O Google recusou a autorização. Tente conectar de novo.');
  });

  it('outro erro da API mostra falha genérica', async () => {
    vi.mocked(googleAdsService.conectar).mockRejectedValue(new ApiError('internal_error', 500, { error: 'internal_error' }));
    abrir('code=c1&state=st-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar a conta Google.');
  });

  it('mostra o andamento enquanto conecta', async () => {
    let resolver: (v: typeof VISAO) => void = () => {};
    vi.mocked(googleAdsService.conectar).mockReturnValue(new Promise((r) => (resolver = r)));
    abrir('code=c1&state=st-1');
    expect(await screen.findByText('Conectando a conta Google…')).toBeInTheDocument();
    resolver(VISAO);
    await waitFor(() => expect(screen.queryByText('Conectando a conta Google…')).not.toBeInTheDocument());
  });
});
