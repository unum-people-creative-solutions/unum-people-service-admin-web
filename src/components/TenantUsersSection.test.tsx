import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TenantUsersSection } from './TenantUsersSection';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/useAuthStore';
import { tenantService } from '@/services/tenantService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    listUsers: vi.fn(),
    addUser: vi.fn(),
    removeUser: vi.fn(),
    updateUserRole: vi.fn(),
    blockUser: vi.fn(),
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
    } as any);
    vi.mocked(tenantService.listUsers).mockResolvedValue(mockUsers as any);
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
    vi.mocked(tenantService.listUsers).mockResolvedValue([] as any);

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
});
