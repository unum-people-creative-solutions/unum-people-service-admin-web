export const CHAVE_STATE = 'google-ads-oauth-state';
export const CAMINHO_RETORNO = '/settings/google-ads/callback';

const URL_AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';

// Login da plataforma: code offline, com consentimento para o refresh token.
export function montarUrlGoogle(clientId: string, origem: string, state: string): string {
  const url = new URL(URL_AUTORIZACAO);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/datamanager');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('redirect_uri', `${origem}${CAMINHO_RETORNO}`);
  url.searchParams.set('state', state);
  return url.toString();
}

export function iniciarConexao(
  clientId: string,
  navegar: (url: string) => void = (url) => window.location.assign(url),
): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem(CHAVE_STATE, state);
  navegar(montarUrlGoogle(clientId, window.location.origin, state));
}

// Lê e apaga. sessionStorage pode lançar (modo privado); aí devolve null.
export function lerStateGuardado(): string | null {
  try {
    const state = sessionStorage.getItem(CHAVE_STATE);
    sessionStorage.removeItem(CHAVE_STATE);
    return state;
  } catch {
    return null;
  }
}
