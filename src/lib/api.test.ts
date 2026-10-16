import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: { getState: () => ({ token: 'token-teste', logout: vi.fn() }) },
}));
vi.mock('@/lib/cognito', () => ({ userPool: {} }));

import { apiFetch } from './api';
import { ApiError } from './apiError';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resposta 409 vira ApiError com o status HTTP e a mensagem do backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'term in use' }), { status: 409 })),
    );

    const chamada = apiFetch('/admin/terms/t1', { method: 'DELETE' });

    await expect(chamada).rejects.toBeInstanceOf(ApiError);
    await expect(chamada).rejects.toMatchObject({ status: 409, message: 'term in use' });
  });
});
