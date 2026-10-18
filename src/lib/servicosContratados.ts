import type { Tenant } from '@/types/tenant';

// Serviços que liberam ferramentas na tela de usuários. Mesma regra antiga da
// API (Tenant.HasService): sem enabled_services e sem site, vale o CRM.
export function servicosContratados(tenant: Tenant): string[] {
  const servicos = tenant.enabled_services ?? [];
  const temSite = (tenant.site_urls?.length ?? 0) > 0 || !!tenant.site_url;
  if (servicos.length === 0 && !temSite) return ['crm'];
  return servicos;
}
