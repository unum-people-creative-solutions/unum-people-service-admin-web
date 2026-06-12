export type PlanStatus = 'ativo' | 'em_atraso' | 'pausado' | 'cancelado';
export type PlanCycle = 'mensal' | 'anual';
export type PlanID = 'lp_flash' | 'lp_basico' | 'lp_intermediario' | 'lp_avancado' | 'lp_personalizado';

export interface Tenant {
  id: string;
  api_key: string;
  nome_negocio: string;
  email_contato: string;
  documento: string;
  nicho: string;
  site_url?: string;
  slug?: string;
  enabled_services?: string[];
  google_ads_customer_id?: string;
  use_mcc_auth: boolean;
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
  site_url?: string;
  slug?: string;
  enabled_services?: string[];
  google_ads_customer_id?: string;
  use_mcc_auth: boolean;
  plan_id: PlanID;
  plan_value: number;
  plan_cycle: PlanCycle;
}

