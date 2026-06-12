import { CognitoUser, CognitoRefreshToken } from 'amazon-cognito-identity-js';
import { useAuthStore } from "@/store/useAuthStore";
import { userPool } from "@/lib/cognito";

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

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
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
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: (path: string) => apiFetch(path, { method: 'GET' }),
  post: (path: string, body?: any) => apiFetch(path, { 
    method: 'POST', 
    body: body ? JSON.stringify(body) : undefined 
  }),
  patch: (path: string, body?: any) => apiFetch(path, { 
    method: 'PATCH', 
    body: body ? JSON.stringify(body) : undefined 
  }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
};
