import { CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js';
import { useAuthStore } from "@/store/useAuthStore";
import { userPool } from "@/lib/cognito";
import { ApiError } from "@/lib/apiError";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.unumpeople.com/v1';

async function refreshAccessToken(): Promise<string | null> {
  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) return null;

  return new Promise((resolve) => {
    const cognitoUser = new CognitoUser({ Username: user.email, Pool: userPool });

    cognitoUser.refreshSession(
      new CognitoRefreshToken({ RefreshToken: refreshToken }),
      (err, session) => {
        if (err || !session) {
          resolve(null);
          return;
        }
        const newToken = session.getIdToken().getJwtToken();
        useAuthStore.getState().setToken(newToken);
        resolve(newToken);
      }
    );
  });
}

// T é o formato da resposta, dado por quem chama (normalmente pelo tipo de
// retorno declarado no serviço). Corpo vazio vira null.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });
    }

    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(error.error || 'Request failed', response.status, error);
  }

  // 204 No Content (DELETE) ou 201/200 sem corpo: response.json() em string vazia
  // lança "Unexpected end of JSON input". Só faz parse se houver conteúdo.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { 
    method: 'POST', 
    body: body ? JSON.stringify(body) : undefined 
  }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { 
    method: 'PATCH', 
    body: body ? JSON.stringify(body) : undefined 
  }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { 
    method: 'PUT', 
    body: body ? JSON.stringify(body) : undefined 
  }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
