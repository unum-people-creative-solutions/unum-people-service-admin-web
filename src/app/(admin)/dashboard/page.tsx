'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { tenantService } from '@/services/tenantService';
import { Users, Ban, Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: tenantService.getStats,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ['admin-audit-logs'],
    queryFn: () => tenantService.getLogs({ type: 'audit' }),
    refetchInterval: 30000,
  });

  const { data: systemErrors, isLoading: errorsLoading } = useQuery<any[]>({
    queryKey: ['admin-system-errors'],
    queryFn: () => tenantService.getSystemErrors({ start: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() }),
    refetchInterval: 30000,
  });

  const logsLoading = auditLoading || errorsLoading;

  const unifiedLogs = useMemo(() => {
    // Garante que estamos lidando com arrays, mesmo que a API mude a estrutura do objeto
    const rawAudit = Array.isArray(auditLogs) ? auditLogs : (auditLogs as any)?.items || (auditLogs as any)?.logs || [];
    const rawErrors = Array.isArray(systemErrors) ? systemErrors : (systemErrors as any)?.items || (systemErrors as any)?.errors || [];

    const normalizedAudit = rawAudit.map((log: any, index: number) => {
      const ts = log.created_at || log.timestamp || log.time;
      return {
        id: log.sk || log.id || `audit-${index}-${ts}`,
        timestamp: ts,
        type: 'audit' as const,
        level: log.action || log.level || 'ACTIVITY',
        actor: log.actor || 'System',
        target_id: log.target_id,
        details: log.new_state || log.message,
        request_id: log.request_id || log.raw?.request_id,
        raw: log
      };
    });

    const normalizedErrors = rawErrors.map((err: any, index: number) => {
      let ts = err.timestamp || err.time || new Date().toISOString();
      
      // Ajuste de fuso horário: Se a data vier do CloudWatch sem indicação de fuso (ou em UTC)
      // e estiver 3 horas adiantada, vamos normalizar para o objeto Date tratar corretamente.
      // CloudWatch costuma enviar em UTC.
      try {
        const date = new Date(String(ts).replace(' ', 'T'));
        if (!isNaN(date.getTime())) {
          // Se detectarmos que os erros estão vindo em UTC puro (comum em CloudWatch)
          // e o sistema espera horário local de Brasília (UTC-3), o Date() já deveria
          // lidar com isso se a string estivesse em formato ISO correto.
          // Como há um gap, vamos forçar o ajuste de 3 horas para sincronizar a lista.
          date.setHours(date.getHours() - 3);
          ts = date.toISOString();
        }
      } catch (e) {
        console.error('Error parsing timestamp:', ts);
      }

      return {
        id: err.id || `error-${index}-${ts}`,
        timestamp: ts,
        type: 'error' as const,
        level: err.level || 'ERROR',
        message: err.message || 'Error occurred',
        service: err.service || 'System',
        request_id: err.request_id || err.raw?.request_id,
        raw: err
      };
    });

    return [...normalizedAudit, ...normalizedErrors]
      .filter(log => log.timestamp)
      .sort((a, b) => {
        const parseDate = (ts: string) => {
          if (!ts) return 0;
          const normalized = String(ts).replace(' ', 'T');
          const d = new Date(normalized);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return parseDate(b.timestamp) - parseDate(a.timestamp);
      })
      .slice(0, 50);
  }, [auditLogs, systemErrors]);

  const cards = [
    { title: 'Total Tenants', value: stats?.total_tenants || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Ativos', value: stats?.active_tenants || 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Bloqueados', value: stats?.blocked_tenants || 0, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Est. MRR', value: `R$ ${(stats?.estimated_mrr || 0).toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard de Administração</h1>
            <p className="text-slate-500">Visão geral do sistema e monitoramento de saúde.</p>
          </div>
          <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-medium text-sm border border-primary-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
            Admin Central
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
                <card.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900">{statsLoading ? '...' : card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Logs de Atividade / Erros */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={18} className="text-slate-500" />
                  Atividades e Logs Recentes
                </h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Live</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {logsLoading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50/50"></div>)
                ) : unifiedLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Nenhum log registrado recentemente.</div>
                ) : unifiedLogs.map((log) => (
                  <div key={log.id} className={`p-4 hover:bg-slate-50 transition-colors ${log.type === 'error' ? 'bg-red-50/30' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {log.type === 'error' && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="System Error"></span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          log.type === 'error' || log.level === 'INTEGRATION_ERROR' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.type === 'error' && <AlertCircle size={10} />}
                          {log.level}
                        </span>
                        {log.type === 'error' && log.service && (
                          <span className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono uppercase">
                            {log.service}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    
                    {log.type === 'audit' ? (
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{log.actor || 'SYSTEM'}</span>{' '}
                        {log.level === 'TENANT_CREATED' && `criou o tenant ${log.target_id}`}
                        {log.level === 'TENANT_UPDATED' && `atualizou o tenant ${log.target_id}`}
                        {log.level === 'INTEGRATION_ERROR' && `detectou erro na integração ${log.target_id}`}
                        {!['TENANT_CREATED', 'TENANT_UPDATED', 'INTEGRATION_ERROR'].includes(log.level) && (log.level || 'executou uma ação')}
                      </p>
                    ) : (
                      <p className="text-sm text-red-800 font-medium">
                        {log.message}
                      </p>
                    )}
                    
                    {log.details && (
                      <div className="mt-2 text-xs bg-white/50 p-2 rounded border border-slate-100 text-slate-600 font-mono overflow-x-auto">
                        {log.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
