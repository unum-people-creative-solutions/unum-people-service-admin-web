// Contratos de GET /admin/dashboard/* (unum-people-services-api,
// internal/handler/admin_handler.go e internal/domain/{audit,syslog}.go).

// GET /admin/dashboard/stats
export interface DashboardStats {
  total_tenants: number;
  active_tenants: number;
  blocked_tenants: number;
  estimated_mrr: number;
  system_health: string;
}

// GET /admin/dashboard/logs (domain.AuditRecord)
export interface AuditRecord {
  tenant_id: string;
  sk: string;
  actor: string;
  action: string;
  target_id: string;
  old_state?: string;
  new_state?: string;
  ip_address: string;
  request_id: string;
  expires_at: number;
  created_at: string;
}

// GET /admin/dashboard/errors (domain.CloudWatchLog)
export interface SystemErrorLog {
  timestamp: string;
  message: string;
  level: string;
  request_id: string;
  service: string;
}
