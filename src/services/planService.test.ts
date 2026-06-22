import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planService } from './planService';

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
});
