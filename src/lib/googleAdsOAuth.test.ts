import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHAVE_STATE, iniciarConexao, lerStateGuardado, montarUrlGoogle } from './googleAdsOAuth';

// google-ads-conectar-no-admin T305 (G11).
describe('googleAdsOAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('monta a URL do Google com os parâmetros do login da plataforma', () => {
    const url = new URL(montarUrlGoogle('cli.apps.googleusercontent.com', 'https://admin.unumpeople.com.br', 'st-1'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const p = url.searchParams;
    expect(p.get('client_id')).toBe('cli.apps.googleusercontent.com');
    expect(p.get('response_type')).toBe('code');
    expect(p.get('scope')).toBe('openid email https://www.googleapis.com/auth/datamanager');
    expect(p.get('access_type')).toBe('offline');
    expect(p.get('prompt')).toBe('consent');
    expect(p.get('redirect_uri')).toBe('https://admin.unumpeople.com.br/settings/google-ads/callback');
    expect(p.get('state')).toBe('st-1');
  });

  it('guarda um state novo na sessão e navega para o Google com ele', () => {
    const navegar = vi.fn();
    iniciarConexao('cli', navegar);
    const guardado = sessionStorage.getItem(CHAVE_STATE);
    expect(guardado).toMatch(/^[0-9a-f-]{36}$/);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(new URL(navegar.mock.calls[0][0]).searchParams.get('state')).toBe(guardado);

    iniciarConexao('cli', navegar);
    expect(sessionStorage.getItem(CHAVE_STATE)).not.toBe(guardado);
  });

  it('lê o state guardado uma vez só', () => {
    sessionStorage.setItem(CHAVE_STATE, 'st-9');
    expect(lerStateGuardado()).toBe('st-9');
    expect(lerStateGuardado()).toBeNull();
  });
});
