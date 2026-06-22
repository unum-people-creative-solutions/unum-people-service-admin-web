import { api } from '@/lib/api';
import { Plan } from '@/types/tenant';

// A API /admin/plans retorna os planos já agrupados por status, com a contagem
// de tenants vinculados em cada um (usada na seção de desativados e no gate de exclusão).
export interface PlansGrouped {
  active: Plan[];
  inactive: Plan[];
}

export const planService = {
  listPlans: async (): Promise<PlansGrouped> => {
    return api.get('/admin/plans');
  },
  createPlan: async (plan: Omit<Plan, 'slug' | 'tenant_count' | 'created_at' | 'updated_at'>): Promise<Plan> => {
    return api.post('/admin/plans', plan);
  },
  updatePlan: async (slug: string, plan: Partial<Plan>): Promise<Plan> => {
    return api.put(`/admin/plans/${slug}`, plan);
  },
  deletePlan: async (slug: string): Promise<void> => {
    return api.delete(`/admin/plans/${slug}`);
  }
};
