import { render, screen, fireEvent } from '@testing-library/react';
import { TenantSitesSection } from './TenantSitesSection';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { tenantService } from '@/services/tenantService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/tenantService', () => ({
  tenantService: {
    listSites: vi.fn(),
    getSite: vi.fn(),
  },
}));

describe('TenantSitesSection Component', () => {
  const mockTenantId = 'tenant-123';
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  function renderSection() {
    return render(
      <QueryClientProvider client={queryClient}>
        <TenantSitesSection tenantId={mockTenantId} />
      </QueryClientProvider>
    );
  }

  test('T01 - lista os sites com slug, status, layout/tema e link do site', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status: 'AGUARDANDO_ATIVACAO',
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
        created_at: '2026-09-06T10:00:00Z',
      },
    ] as any);

    renderSection();

    expect(await screen.findByText('estudio-foto')).toBeDefined();
    expect(screen.getByText((c, el) => el?.tagName.toLowerCase() === 'span' && el?.textContent?.trim() === 'Aguardando Ativação')).toBeDefined();
    expect(screen.getByText('l1 / t1')).toBeDefined();

    const link = screen.getByRole('link', { name: /Abrir site/i });
    expect(link).toHaveAttribute('href', 'https://estudio-foto.unumpeople.app');
  });

  test('T02 - trata estado vazio sem sites', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([]);

    renderSection();

    expect(await screen.findByText('Nenhum site do LP Builder para este tenant.')).toBeDefined();
  });

  test('T03 - trata erro de listSites sem quebrar', async () => {
    vi.mocked(tenantService.listSites).mockRejectedValue(new Error('Network error'));

    renderSection();

    expect(await screen.findByText('Erro ao carregar sites.')).toBeDefined();
  });

  test('T04 - "Ver config" abre o detalhe com content/contact/seo', async () => {
    vi.mocked(tenantService.listSites).mockResolvedValue([
      {
        site_id: 'lp_t1',
        slug: 'estudio-foto',
        status: 'AGUARDANDO_ATIVACAO',
        url: 'https://estudio-foto.unumpeople.app',
        layout_id: 'l1',
        theme_id: 't1',
      },
    ] as any);
    vi.mocked(tenantService.getSite).mockResolvedValue({
      site_id: 'lp_t1',
      slug: 'estudio-foto',
      status: 'AGUARDANDO_ATIVACAO',
      url: 'https://estudio-foto.unumpeople.app',
      layout_id: 'l1',
      theme_id: 't1',
      schema_version: 1,
      content: { 'header.business_name': { kind: 'text', value: 'Estúdio Foto' } },
      contact: { whatsapp: '41999998888' },
      seo: { title: 'Estúdio Foto' },
    } as any);

    renderSection();

    const verConfigBtn = await screen.findByRole('button', { name: /Ver config/i });
    fireEvent.click(verConfigBtn);

    expect(await screen.findByText(/header\.business_name/)).toBeDefined();
    expect(screen.getByText(/41999998888/)).toBeDefined();
    expect(tenantService.getSite).toHaveBeenCalledWith(mockTenantId, 'lp_t1');
  });
});
