import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewTenantPage from './page';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useRouter } from 'next/navigation';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/services/planService', () => ({
  planService: {
    listPlans: vi.fn().mockResolvedValue({
      active: [
        { slug: 'plan_mock_1', nome: 'Mock Plan', activation_fee: 100, monthly_value: 50, included_services: ['site', 'blog'] }
      ],
      inactive: []
    }),
  },
}));

vi.mock('@/services/termService', () => ({
  termService: {
    list: vi.fn().mockResolvedValue([
      { id: 'term_mock_1', name: 'Termo Mock', description: '', is_active: true, current_version: 1 },
    ]),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewTenantPage />
    </QueryClientProvider>
  );
}

function fillRequiredBusinessFields(container: HTMLElement) {
  fireEvent.change(container.querySelector('[name="nome_negocio"]')!, { target: { value: 'Empresa Teste' } });
  fireEvent.change(container.querySelector('[name="documento"]')!, { target: { value: '94.586.814/0001-01' } });
  fireEvent.change(container.querySelector('[name="nicho"]')!, { target: { value: 'Tech' } });
  fireEvent.change(container.querySelector('[name="nome_admin"]')!, { target: { value: 'Admin Teste' } });
  fireEvent.change(container.querySelector('[name="email_contato"]')!, { target: { value: 'admin@teste.com' } });
}

describe('NewTenantPage - T15 site_urls (grupo repetível na criação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);
  });

  test('adicionar dois sites e submeter produz payload com os dois', async () => {
    const { container } = renderPage();

    fillRequiredBusinessFields(container);

    const addBtn = screen.getByRole('button', { name: /adicionar site/i });
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);

    const urlInputs = screen.getAllByRole('textbox', { name: /url do site/i });
    expect(urlInputs).toHaveLength(2);
    fireEvent.change(urlInputs[0], { target: { value: 'https://a.com' } });
    fireEvent.change(urlInputs[1], { target: { value: 'https://b.com' } });

    fireEvent.click(screen.getByRole('button', { name: /criar tenant/i }));

    await waitFor(() => expect(tenantService.create).toHaveBeenCalled());
    const payload = vi.mocked(tenantService.create).mock.calls[0][0];
    expect(payload.site_urls).toEqual(['https://a.com', 'https://b.com']);
  });

  test('lista vazia é válida e envia site_urls vazio', async () => {
    const { container } = renderPage();

    fillRequiredBusinessFields(container);
    fireEvent.click(screen.getByRole('button', { name: /criar tenant/i }));

    await waitFor(() => expect(tenantService.create).toHaveBeenCalled());
    const payload = vi.mocked(tenantService.create).mock.calls[0][0];
    expect(payload.site_urls).toEqual([]);
  });

  test('item inválido bloqueia o submit com mensagem visível', async () => {
    const { container } = renderPage();

    fillRequiredBusinessFields(container);

    fireEvent.click(screen.getByRole('button', { name: /adicionar site/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /url do site/i }), {
      target: { value: 'nao-e-url' },
    });

    fireEvent.click(screen.getByRole('button', { name: /criar tenant/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(tenantService.create).not.toHaveBeenCalled();
  });
});
