import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';
import { useAuthStore } from '@/store/useAuthStore';

// spec: gestao-de-acesso-f5 D-F5-4, D-F5-9. O painel do operador é só do grupo
// GlobalAdmin; o grupo legado Admins (o único membro é uma conta de cliente) não entra.

const push = vi.hoisted(() => vi.fn());
const grupos = vi.hoisted(() => ({ atual: [] as string[] }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/cognito', () => ({ userPool: {} }));
vi.mock('jwt-decode', () => ({ jwtDecode: () => ({ email: 'x@x.com', 'cognito:groups': grupos.atual }) }));
vi.mock('amazon-cognito-identity-js', () => ({
  AuthenticationDetails: class {},
  CognitoUser: class {
    authenticateUser(_: unknown, cb: { onSuccess: (r: unknown) => void }) {
      cb.onSuccess({ getIdToken: () => ({ getJwtToken: () => 'id' }), getRefreshToken: () => ({ getToken: () => 'rt' }) });
    }
  },
}));

async function entrarCom(lista: string[]) {
  grupos.atual = lista;
  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText('E-mail Administrativo'), { target: { value: 'x@x.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no Painel Seguro' }));
}

describe('Login do painel do operador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('grupo Admins sem GlobalAdmin: acesso negado, sem sessão', async () => {
    await entrarCom(['TenantAdmin', 'Admins']);
    expect(await screen.findByText(/Acesso negado/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('GlobalAdmin entra', async () => {
    await entrarCom(['GlobalAdmin']);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(useAuthStore.getState().isAdmin).toBe(true);
  });

  it('a sessão só é de operador com GlobalAdmin', () => {
    useAuthStore.getState().setAuth({ email: 'x@x.com', groups: ['Admins'] }, 't');
    expect(useAuthStore.getState().isAdmin).toBe(false);
    useAuthStore.getState().setAuth({ email: 'x@x.com', groups: ['GlobalAdmin'] }, 't');
    expect(useAuthStore.getState().isAdmin).toBe(true);
  });
});
