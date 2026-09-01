import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planService, resolvePlanProduct, resolvePagesIncluded } from './planService';
import { Plan } from '@/types/tenant';

// Mock do axios/api
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('planService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve listar planos chamando /admin/plans', async () => {
    const { api } = await import('@/lib/api');
    (api.get as any).mockResolvedValueOnce([]);
    await planService.listPlans();
    expect(api.get).toHaveBeenCalledWith('/admin/plans');
  });

  it('deve criar um plano via POST /admin/plans', async () => {
    const { api } = await import('@/lib/api');
    (api.post as any).mockResolvedValueOnce({});
    await planService.createPlan({ nome: 'Teste' } as any);
    expect(api.post).toHaveBeenCalledWith('/admin/plans', { nome: 'Teste' });
  });

  it('deve lidar com erro 409 ao excluir plano vinculado', async () => {
    const error409 = { response: { status: 409 } };
    const { api } = await import('@/lib/api');
    (api.delete as any).mockRejectedValueOnce(error409);

    await expect(planService.deletePlan('plano-basico')).rejects.toMatchObject({
      response: { status: 409 }
    });
  });

  // TASK-FE-001 — product / pages_included (leitura tolerante + contrato de escrita)
  it('leitura tolerante: product ausente resolve para plataforma, nunca landing-page', () => {
    expect(resolvePlanProduct(undefined)).toBe('plataforma');
    // Payload real do backend para plano legado: chave presente com string vazia
    // (json:"product" sem omitempty). ?? não cobre esse caso.
    expect(resolvePlanProduct('')).toBe('plataforma');
    expect(resolvePlanProduct('plataforma')).toBe('plataforma');
    expect(resolvePlanProduct('landing-page')).toBe('landing-page');
  });

  it('leitura tolerante: pages_included ausente resolve para 0', () => {
    expect(resolvePagesIncluded(undefined)).toBe(0);
    expect(resolvePagesIncluded(0)).toBe(0);
    expect(resolvePagesIncluded(1)).toBe(1);
  });

  it('listPlans aplica defaults de leitura em item legado sem product/pages_included', async () => {
    const { api } = await import('@/lib/api');
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      active: [{ slug: 'legado', nome: 'Legado' }],
      inactive: [],
    });

    const result = await planService.listPlans();

    expect(result.active[0].product).toBe('plataforma');
    expect(result.active[0].pages_included).toBe(0);
  });

  it('listPlans trata product vazio (payload HTTP real de plano legado) como plataforma', async () => {
    const { api } = await import('@/lib/api');
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      active: [{ slug: 'legado', nome: 'Legado', product: '', pages_included: 0 }],
      inactive: [],
    });

    const result = await planService.listPlans();

    expect(result.active[0].product).toBe('plataforma');
    expect(result.active[0].pages_included).toBe(0);
  });

  it('createPlan envia product e pages_included no POST sem any', async () => {
    const { api } = await import('@/lib/api');
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const payload: Omit<Plan, 'slug' | 'tenant_count' | 'created_at' | 'updated_at'> = {
      nome: 'LP Básico',
      descricao: 'Landing page',
      activation_fee: 200,
      monthly_value: 99,
      included_services: ['lp'],
      is_active: true,
      cycle: 'mensal',
      product: 'landing-page',
      pages_included: 1,
    };

    await planService.createPlan(payload);

    expect(api.post).toHaveBeenCalledWith('/admin/plans', {
      nome: 'LP Básico',
      descricao: 'Landing page',
      activation_fee: 200,
      monthly_value: 99,
      included_services: ['lp'],
      is_active: true,
      cycle: 'mensal',
      product: 'landing-page',
      pages_included: 1,
    });
  });
});
