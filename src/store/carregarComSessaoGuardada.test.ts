import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bug em produção (19/10, fase 5): com uma sessão guardada no navegador, o
// login do admin-web ficava em loop. O persist reidrata durante o create(),
// e o onRehydrateStorage chamava useAuthStore antes de ele existir; o erro era
// engolido e hasHydrated nunca virava true. Este teste carrega o módulo como o
// navegador carrega: com o localStorage já preenchido.
describe('carregar o app com uma sessão guardada', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('termina a reidratação e recalcula isAdmin pelos grupos', async () => {
    for (const [groups, esperado] of [[['Admins'], false], [['GlobalAdmin'], true]] as const) {
      vi.resetModules();
      localStorage.setItem('admin-auth-storage', JSON.stringify({
        state: { user: { email: 'x@x.com', groups }, token: 't', isAuthenticated: true, isAdmin: true },
        version: 0,
      }));
      const { useAuthStore } = await import('./useAuthStore');
      const estado = useAuthStore.getState();
      expect(estado.hasHydrated).toBe(true);
      expect(estado.isAuthenticated).toBe(true);
      expect(estado.isAdmin).toBe(esperado);
    }
  });

  it('sem sessão guardada (primeiro acesso), também termina a reidratação', async () => {
    const { useAuthStore } = await import('./useAuthStore');
    expect(useAuthStore.getState().hasHydrated).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
