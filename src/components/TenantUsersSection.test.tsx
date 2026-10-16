import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TenantUsersSection } from './TenantUsersSection';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';
import { tenantService } from '@/services/tenantService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TenantUser } from '@/types/tenant';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    listUsers: vi.fn(),
    addUser: vi.fn(),
    removeUser: vi.fn(),
    updateUserRole: vi.fn(),
    blockUser: vi.fn(),
    updateUserName: vi.fn(),
    resetUserPassword: vi.fn(),
  },
}));

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('TenantUsersSection Component', () => {
  const mockTenantId = 'tenant-123';
  const mockUsers = [
    {
      email: 'logged@test.com',
      name: 'Logged User',
      role: 'admin' as const,
      is_blocked: false,
      created_at: '2026-06-12T12:00:00Z',
    },
    {
      email: 'other@test.com',
      name: 'Other User',
      role: 'user' as const,
      is_blocked: false,
      created_at: '2026-06-12T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.mocked(useAuthStore).mockReturnValue({
      user: { email: 'logged@test.com', groups: ['TenantAdmin'] },
    } as unknown as ReturnType<typeof useAuthStore>);
    vi.mocked(tenantService.listUsers).mockResolvedValue(mockUsers as TenantUser[]);
  });

  test('renderiza os dados da tabela corretamente', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const table = await screen.findByRole('table');
    expect(table).toBeDefined();

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(3); // Header + 2 users

    expect(screen.getByText('Logged User')).toBeDefined();
    expect(screen.getByText('logged@test.com')).toBeDefined();
    expect(screen.getByText('Other User')).toBeDefined();
    expect(screen.getByText('other@test.com')).toBeDefined();
  });

  test('exibe mensagem apropriada para lista vazia', async () => {
    vi.mocked(tenantService.listUsers).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/nenhum usuário/i)).toBeDefined();
  });

  test('abre o modal ao clicar em "Adicionar Usuário"', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const addButton = await screen.findByRole('button', { name: /Adicionar Usuário/i });
    fireEvent.click(addButton);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Adicionar Usuário ao Tenant/i)).toBeDefined();
    expect(screen.getByLabelText(/Nome/i)).toBeDefined();
    expect(screen.getByLabelText(/E-mail/i)).toBeDefined();
    expect(screen.getByLabelText(/Perfil|Role/i)).toBeDefined();
  });

  test('valida campos obrigatórios (nome e e-mail) no modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const addButton = await screen.findByRole('button', { name: /Adicionar Usuário/i });
    fireEvent.click(addButton);

    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveButton);

    expect(await screen.findByText(/nome é obrigatório/i)).toBeDefined();
    expect(await screen.findByText(/e-mail é obrigatório/i)).toBeDefined();
  });

  test('desativa os botões de remover/rebaixar para o próprio usuário logado', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const loggedRow = (await screen.findByText('logged@test.com')).closest('tr');
    expect(loggedRow).not.toBeNull();

    const loggedRemoveBtn = within(loggedRow!).getByRole('button', { name: /remover/i });
    expect(loggedRemoveBtn).toBeDisabled();

    // Abre o modal de edição para o usuário logado
    const loggedEditBtn = within(loggedRow!).getByRole('button', { name: /editar/i });
    fireEvent.click(loggedEditBtn);

    const loggedRoleSelect = screen.getByRole('combobox', { name: /perfil/i });
    expect(loggedRoleSelect).toBeDisabled();
    
    const loggedBlockCheckbox = screen.getByRole('checkbox');
    expect(loggedBlockCheckbox).toBeDisabled();

    // Fecha o modal
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    const otherRow = screen.getByText('other@test.com').closest('tr');
    expect(otherRow).not.toBeNull();

    const otherRemoveBtn = within(otherRow!).getByRole('button', { name: /remover/i });
    expect(otherRemoveBtn).not.toBeDisabled();

    // Abre o modal de edição para outro usuário
    const otherEditBtn = within(otherRow!).getByRole('button', { name: /editar/i });
    fireEvent.click(otherEditBtn);

    const otherRoleSelect = screen.getByRole('combobox', { name: /perfil/i });
    expect(otherRoleSelect).not.toBeDisabled();
    
    const otherBlockCheckbox = screen.getByRole('checkbox');
    expect(otherBlockCheckbox).not.toBeDisabled();
  });

  test('permite editar o nome do usuário e chama a mutation correta', async () => {
    vi.mocked(tenantService.updateUserName).mockResolvedValue({ message: 'Name updated' });

    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const otherRow = (await screen.findByText('other@test.com')).closest('tr');
    expect(otherRow).not.toBeNull();

    // Abre o modal de edição
    const editBtn = within(otherRow!).getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    // Encontra o input de Nome
    const nameInput = screen.getByDisplayValue('Other User') as HTMLInputElement;
    // O teste deve falhar aqui porque o input ainda está disabled
    expect(nameInput.disabled).toBe(false);
    
    fireEvent.change(nameInput, { target: { value: 'Novo Nome Alterado' } });

    // Salva as alterações
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(tenantService.updateUserName).toHaveBeenCalledWith(mockTenantId, 'other@test.com', 'Novo Nome Alterado');
    });
  });

  test('deve exibir confirm e chamar resetUserPassword ao clicar em Resetar Senha na modal de edição', async () => {
    vi.mocked(tenantService.resetUserPassword).mockResolvedValue({ message: 'Code sent' });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const otherRow = (await screen.findByText('other@test.com')).closest('tr');
    expect(otherRow).not.toBeNull();

    // Abre o modal de edição
    const editBtn = within(otherRow!).getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    // Encontra o botão de Resetar Senha
    const resetPasswordBtn = screen.getByRole('button', { name: /Resetar Senha/i });
    fireEvent.click(resetPasswordBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Deseja redefinir e enviar uma nova senha temporária para o e-mail deste usuário\?/i)
    );

    await waitFor(() => {
      expect(tenantService.resetUserPassword).toHaveBeenCalledWith(mockTenantId, 'other@test.com');
    });

    confirmSpy.mockRestore();
  });

  test('exibe corretamente o status Bloqueado para usuários bloqueados', async () => {
    const blockedUser = {
      email: 'blocked@test.com',
      name: 'Blocked User',
      role: 'user' as const,
      is_blocked: true,
      created_at: '2026-06-12T12:00:00Z',
    };
    
    vi.mocked(tenantService.listUsers).mockResolvedValue([blockedUser] as TenantUser[]);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );

    const table = await screen.findByRole('table');
    expect(table).toBeDefined();

    expect(screen.getByText('Blocked User')).toBeDefined();
    
    // Deve exibir o label Bloqueado (status visual)
    const statusLabel = screen.getByText('Bloqueado');
    expect(statusLabel).toBeDefined();
    expect(statusLabel.className).toContain('bg-red-50 text-red-700');
  });
});

// A API devolve também os papéis de vínculo TenantAdmin e GlobalAdmin. A lista
// mostrava "Usuário" para eles e a edição caía em "Administrador".
describe('TenantUsersSection — papéis de vínculo', () => {
  const usuarios = [
    { email: 'a@test.com', name: 'Pessoa Admin', role: 'admin', is_blocked: false, created_at: '2026-06-12T12:00:00Z' },
    { email: 'u@test.com', name: 'Pessoa User', role: 'user', is_blocked: false, created_at: '2026-06-12T12:00:00Z' },
    { email: 't@test.com', name: 'Pessoa TenantAdmin', role: 'TenantAdmin', is_blocked: false, created_at: '2026-06-12T12:00:00Z' },
    { email: 'g@test.com', name: 'Pessoa GlobalAdmin', role: 'GlobalAdmin', is_blocked: false, created_at: '2026-06-12T12:00:00Z' },
  ] as TenantUser[];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    vi.mocked(useAuthStore).mockReturnValue({
      user: { email: 'outra@test.com', groups: ['GlobalAdmin'] },
    } as unknown as ReturnType<typeof useAuthStore>);
    vi.mocked(tenantService.listUsers).mockResolvedValue(usuarios);
  });

  const renderizar = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TenantUsersSection tenantId="tenant-unum" />
      </QueryClientProvider>
    );

  test.each([
    ['Pessoa Admin', 'Admin'],
    ['Pessoa User', 'Usuário'],
    ['Pessoa TenantAdmin', 'TenantAdmin'],
    ['Pessoa GlobalAdmin', 'GlobalAdmin'],
  ])('a lista mostra o papel de %s como %s', async (nome, rotulo) => {
    renderizar();
    const linha = (await screen.findByText(nome)).closest('tr') as HTMLElement;
    expect(within(linha).getByText(rotulo)).toBeDefined();
  });

  test('a edição de um GlobalAdmin mostra GlobalAdmin selecionado', async () => {
    renderizar();
    const linha = (await screen.findByText('Pessoa GlobalAdmin')).closest('tr') as HTMLElement;
    fireEvent.click(within(linha).getByRole('button', { name: 'Editar' }));

    const perfil = screen.getByLabelText('Perfil') as HTMLSelectElement;
    expect(perfil.value).toBe('GlobalAdmin');
    expect(within(perfil).getByRole('option', { selected: true }).textContent).toBe('GlobalAdmin');
  });

  test('salvar sem mudar o papel de um GlobalAdmin não altera o papel', async () => {
    vi.mocked(tenantService.updateUserName).mockResolvedValue({ message: 'ok' });
    renderizar();
    const linha = (await screen.findByText('Pessoa GlobalAdmin')).closest('tr') as HTMLElement;
    fireEvent.click(within(linha).getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tenantService.updateUserRole).not.toHaveBeenCalled();
  });
});
