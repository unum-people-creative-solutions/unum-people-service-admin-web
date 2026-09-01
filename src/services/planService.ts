import { api } from '@/lib/api';
import { Plan, PlanProduct } from '@/types/tenant';

// A API /admin/plans retorna os planos já agrupados por status, com a contagem
// de tenants vinculados em cada um (usada na seção de desativados e no gate de exclusão).
export interface PlansGrouped {
  active: Plan[];
  inactive: Plan[];
}

/** RF-F1-01: atributo ausente ou string vazia (payload HTTP real) nunca casa com landing-page. */
export function resolvePlanProduct(product: Plan['product'] | ''): PlanProduct {
  return product || 'plataforma';
}

/** RF-F1-01: atributo ausente lê como 0. */
export function resolvePagesIncluded(pagesIncluded: Plan['pages_included']): number {
  return pagesIncluded ?? 0;
}

function applyReadDefaults(plan: Plan): Plan {
  return {
    ...plan,
    product: resolvePlanProduct(plan.product),
    pages_included: resolvePagesIncluded(plan.pages_included),
  };
}

export const planService = {
  listPlans: async (): Promise<PlansGrouped> => {
    const data: PlansGrouped = await api.get('/admin/plans');
    // Shape inesperado (teste legado devolve []) — não normaliza para não
    // quebrar consumidores que ainda não conhecem { active, inactive }.
    if (!data || !Array.isArray(data.active)) {
      return data;
    }
    return {
      active: data.active.map(applyReadDefaults),
      inactive: (data.inactive ?? []).map(applyReadDefaults),
    };
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
