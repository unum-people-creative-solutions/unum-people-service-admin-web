export type PlanStatus = 'ativo' | 'em_atraso' | 'pausado' | 'cancelado';
export type PlanCycle = 'mensal' | 'anual';
export type PlanID = 'lp_flash' | 'lp_basico' | 'lp_intermediario' | 'lp_avancado' | 'lp_personalizado';

export interface Tenant {
  id: string;
  nome_negocio: string;
  email_contato: string;
  documento: string;
  nicho: string;
  status: string;
  plan_id: PlanID;
  plan_status: PlanStatus;
  plan_value: number;
  plan_cycle: PlanCycle;
  activated_at: string;
  next_billing_at: string;
  renewal_at: string;
  is_blocked: boolean;
  created_at: string;
}

export interface CreateTenantInput {
  nome_negocio: string;
  nome_admin: string;
  email_contato: string;
  documento: string;
  nicho: string;
  plan_id: PlanID;
  plan_value: number;
  plan_cycle: PlanCycle;
}
