export type TenantStatus = 'aguardando_ativacao' | 'ativo' | 'inadimplente' | 'suspenso' | 'pausado' | 'cancelado' | 'pendente_asaas';
export type PlanCycle = 'mensal' | 'anual';
export type PlanType = 'pago' | 'personalizado' | 'livre';

export interface Plan {
  slug: string;
  nome: string;
  descricao: string;
  activation_fee: number;
  monthly_value: number;
  included_services: string[];
  is_active: boolean;
  cycle: PlanCycle;
  term_id?: string;
  tenant_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Contract {
  plan_id: string;
  plan_type: PlanType;
  term_id?: string;
  activation_fee: number;
  monthly_value: number;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
  asaas_customer_id?: string;
  activation_invoice_url?: string;
  subscription_invoice_url?: string;
  subscription_url_state?: 'aguardando_ativacao' | 'gerando' | 'disponivel' | 'erro';
  created_at: string;
}

export interface Invoice {
  asaas_invoice_id: string;
  asaas_payment_id?: string;
  asaas_subscription_id?: string;
  status: 'SCHEDULED' | 'SYNCHRONIZED' | 'AUTHORIZED' | 'ERROR';
  pdf_url?: string;
  xml_url?: string;
  municipal_service_id?: string;
  error_reason?: string;
  effective_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceAgreementStatus {
  tenant_id: string;
  term_id: string;
  term_name?: string;
  document_url?: string;
  required_version: number;
  status: 'pendente' | 'aceito';
  accepted_version?: number;
  accepted_at?: string;
  accepted_by?: string;
  ip_address?: string;
  user_agent?: string;
  updated_at?: string;
}

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
  status: TenantStatus;
  plan_id: string;
  plan_type?: PlanType;
  plan_status?: TenantStatus; // Mantido para retrocompatibilidade se necessário
  plan_value: number;
  plan_cycle: PlanCycle;
  activated_at: string;
  next_billing_at: string;
  renewal_at: string;
  is_blocked: boolean;
  created_at: string;
  contract?: Contract;
  agreement?: ServiceAgreementStatus;
  asaas_subscription_id?: string;
  delinquency_since?: string;
  is_test_tenant?: boolean;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
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
  plan_id: string;
  plan_type?: PlanType;
  activation_fee?: number;
  monthly_value?: number;
  plan_cycle: PlanCycle;
  temporary_password?: string;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
  is_test_tenant?: boolean;
  term_id?: string;
}

export type TenantUserRole = 'admin' | 'user';

export interface TenantUser {
  email: string;
  name: string;
  role: TenantUserRole;
  is_blocked: boolean;
  created_at: string;
}

export interface AddTenantUserInput {
  email: string;
  name: string;
  role: TenantUserRole;
}

export interface ChangePlanInput {
  plan_id: string;
  plan_type: PlanType;
  monthly_value: number;
  activation_fee: number;
  activation_billing_type?: 'pix' | 'credit_card';
  subscription_billing_type?: 'pix' | 'credit_card';
  plan_cycle?: 'mensal' | 'anual';
  enabled_services?: string[];
  term_id?: string;
}

