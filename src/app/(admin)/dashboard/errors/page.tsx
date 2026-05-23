'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { AlertCircle, Clock, RefreshCw, Filter, Search, ShieldCheck, Bug, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogType = 'error' | 'audit' | 'all';
type Period = 'today' | '7d' | '30d' | 'all';

export default function LogsPage() {
  const [type, setType] = useState<LogType>('error');
  const [service, setService] = useState<string>('');
  const [period, setPeriod] = useState<Period>('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const getPeriodDates = (p: Period) => {
    if (p === 'all') return { start: undefined, end: undefined };
    const end = new Date();
    const start = new Date();
    if (p === 'today') start.setHours(0, 0, 0, 0);
    if (p === '7d') start.setDate(start.getDate() - 7);
    if (p === '30d') start.setDate(start.getDate() - 30);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-logs', type, service, period],
    queryFn: () => {
      const { start, end } = getPeriodDates(period);
      return tenantService.getLogs({
        type: type === 'all' ? undefined : type,
        service: service || undefined,
        start,
        end,
      });
    },
  });

  // Filtro client-side apenas para o search term (RequestID ou Ator)
  const filteredLogs = logs?.filter(log => 
    log.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monitoramento e Auditoria</h1>
            <p className="text-slate-500">Acompanhe erros técnicos e atividades de negócio do ecossistema.</p>
          </div>
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
            Atualizar
          </button>
        </div>

        {/* Filtros e Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
            <div className="flex">
              <button 
                onClick={() => setType('error')}
                className={cn(
                  "px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  type === 'error' ? "border-primary-500 text-primary-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <Bug size={16} />
                Logs de Erros
              </button>
              <button 
                onClick={() => setType('audit')}
                className={cn(
                  "px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  type === 'audit' ? "border-primary-500 text-primary-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <ShieldCheck size={16} />
                Auditoria
              </button>
              <button 
                onClick={() => setType('all')}
                className={cn(
                  "px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  type === 'all' ? "border-primary-500 text-primary-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                Todos
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 bg-white">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por RequestID, Ator ou Ação..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-600">
                <Filter size={16} />
                <select 
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="bg-transparent focus:outline-none text-sm font-medium cursor-pointer"
                >
                  <option value="">Todos os Serviços</option>
                  <option value="CRM">CRM</option>
                  <option value="Ingestion">Ingestion</option>
                  <option value="Ads">Ads Worker</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-600">
                <Calendar size={16} />
                <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  className="bg-transparent focus:outline-none text-sm font-medium cursor-pointer"
                >
                  <option value="today">Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="all">Todo o histórico</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Origem / Ação</th>
                  <th className="px-6 py-4">Mensagem / Detalhes</th>
                  <th className="px-6 py-4">RequestID</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse h-16">
                      <td colSpan={5} className="px-6 py-4 bg-slate-50/10"></td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Nenhum registro encontrado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => {
                    const isError = log.action.includes('ERROR');
                    return (
                      <tr key={log.sk} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={14} />
                            <span className="text-sm">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {log.action}
                          </span>
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            {log.target_id || log.actor || 'System'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 max-w-md">
                            {isError ? (
                              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            ) : (
                              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            )}
                            <div className="truncate">
                              <p className="text-sm text-slate-700 font-medium">
                                {isError ? 'Erro Detectado' : 'Ação de Auditoria'}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">{log.new_state || log.target_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
                            {log.request_id || 'N/A'}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
            <div>
              Filtros: <span className="font-medium text-slate-500">{type}</span> | <span className="font-medium text-slate-500">{service || 'Todos'}</span> | <span className="font-medium text-slate-500">{period}</span>
            </div>
            <div>
              Exibindo {filteredLogs.length} registro(s).
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={20} className="text-slate-400" />
                  Detalhes do Log
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">{selectedLog.sk}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ação</p>
                  <p className="text-sm font-medium text-slate-700 mt-1">{selectedLog.action}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Origem / Ator</p>
                  <p className="text-sm font-medium text-slate-700 mt-1">{selectedLog.target_id || selectedLog.actor || 'System'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Timestamp</p>
                  <p className="text-sm font-medium text-slate-700 mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Request ID</p>
                  <p className="text-sm font-mono text-slate-700 mt-1">{selectedLog.request_id || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.old_state && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Estado Anterior</p>
                  <pre className="p-4 bg-slate-900 rounded-lg text-xs text-emerald-400 overflow-x-auto font-mono">
                    {selectedLog.old_state.startsWith('{') || selectedLog.old_state.startsWith('[') 
                      ? JSON.stringify(JSON.parse(selectedLog.old_state), null, 2)
                      : selectedLog.old_state
                    }
                  </pre>
                </div>
              )}

              {selectedLog.new_state && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Novo Estado / Payload</p>
                  <pre className="p-4 bg-slate-900 rounded-lg text-xs text-blue-400 overflow-x-auto font-mono">
                    {selectedLog.new_state.startsWith('{') || selectedLog.new_state.startsWith('[') 
                      ? JSON.stringify(JSON.parse(selectedLog.new_state), null, 2)
                      : selectedLog.new_state
                    }
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
