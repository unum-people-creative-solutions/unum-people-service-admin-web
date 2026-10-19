import { describe, expect, it } from 'vitest';
import { useAuthStore } from './useAuthStore';

// gestao-de-acesso-f5 D-F5-9 (Verifier das telas): o isAdmin guardado no
// navegador para o grupo legado Admins não sobrevive à recarga.
describe('reidratação da sessão', () => {
  it('recalcula isAdmin pelos grupos: só GlobalAdmin', async () => {
    for (const [groups, esperado] of [[['Admins'], false], [['GlobalAdmin'], true]] as const) {
      localStorage.setItem('admin-auth-storage', JSON.stringify({
        state: { user: { email: 'x@x.com', groups }, token: 't', isAuthenticated: true, isAdmin: true },
        version: 0,
      }));
      await useAuthStore.persist.rehydrate();
      expect(useAuthStore.getState().isAdmin).toBe(esperado);
    }
  });
});
