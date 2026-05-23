'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { tenantService } from '@/services/tenantService';
import { Users, Ban, Activity, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: tenantService.getStats,
  });

  const { data: logs, isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['admin-logs'],
    queryFn: () => tenantService.getLogs(),
    refetchInterval: 30000, // Refresh a cada 30s
  });

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
          <div className="lg:col-span-2 space-y-4">
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
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {logsLoading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-slate-50/50"></div>)
                ) : logs?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Nenhum log registrado recentemente.</div>
                ) : logs?.map((log: any) => (
                  <div key={log.sk} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        log.action === 'INTEGRATION_ERROR' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">{log.actor || 'SYSTEM'}</span> 
                      {log.action === 'TENANT_CREATED' && ` criou o tenant ${log.target_id}`}
                      {log.action === 'TENANT_UPDATED' && ` atualizou o tenant ${log.target_id}`}
                      {log.action === 'INTEGRATION_ERROR' && ` detectou erro na integração ${log.target_id}`}
                    </p>
                    {log.action === 'INTEGRATION_ERROR' && (
                      <div className="mt-2 text-xs bg-red-50 p-2 rounded border border-red-100 text-red-800 font-mono overflow-x-auto">
                        {log.new_state}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alertas Rápidos */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Alertas do Sistema
              </h2>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs font-bold text-amber-800 mb-1">CUIDADO</p>
                  <p className="text-sm text-amber-700">3 tenants estão com pagamento em atraso.</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-xs font-bold text-green-800 mb-1">SAÚDE</p>
                  <p className="text-sm text-green-700">Worker de Ads operando normalmente.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
