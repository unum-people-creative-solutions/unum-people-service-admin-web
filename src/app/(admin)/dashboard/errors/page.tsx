'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { AlertCircle, Clock, RefreshCw, Filter, Search, ShieldCheck, Bug, Calendar, ChevronRight, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogSource = 'system' | 'audit';
type Period = 'today' | '7d' | '30d' | 'all';

export default function LogsPage() {
  const [source, setSource] = useState<LogSource>('system');
  const [service, setService] = useState<string>('');
  const [period, setPeriod] = useState<Period>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const getPeriodDates = (p: Period) => {
    if (p === 'all') return { start: undefined, end: undefined };
    const end = new Date();
    const start = new Date();
    if (p === 'today') start.setHours(start.getHours() - 1); // Última 1h para CloudWatch ser mais rápido
    if (p === '7d') start.setDate(start.getDate() - 7);
    if (p === '30d') start.setDate(start.getDate() - 30);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-logs', source, service, period],
    queryFn: () => {
      const { start, end } = getPeriodDates(period);
      if (source === 'system') {
        return tenantService.getSystemErrors({
          service: service || undefined,
          start,
        });
      } else {
        return tenantService.getLogs({
          type: 'audit',
          service: service || undefined,
          start,
          end,
        });
      }
    },
    // CloudWatch Insights pode demorar, vamos aumentar o tempo de stale
    staleTime: 30000,
  });

  const filteredLogs = logs?.filter(log => {
    const text = (log.message || log.action || log.request_id || '').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Centro de Monitoramento</h1>
            <p className="text-slate-500">
              {source === 'system' 
                ? 'Erros técnicos e alertas coletados via CloudWatch Logs Insights.' 
                : 'Rastreabilidade de ações de negócio gravadas na trilha de auditoria.'}
            </p>
          </div>
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={cn(isFetching && "animate-spin")} />
            {isFetching ? 'Consultando...' : 'Atualizar'}
          </button>
        </div>

        {/* Filtros e Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
            <div className="flex">
              <button 
                onClick={() => setSource('system')}
                className={cn(
                  "px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  source === 'system' ? "border-red-500 text-red-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <Bug size={16} />
                Erros de Sistema (CloudWatch)
              </button>
              <button 
                onClick={() => setSource('audit')}
                className={cn(
                  "px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                  source === 'audit' ? "border-primary-500 text-primary-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <ShieldCheck size={16} />
                Auditoria de Negócio (DynamoDB)
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 bg-white">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por RequestID ou Mensagem..." 
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
                  <option value="Admin">Admin</option>
                  <option value="CRM">CRM Core</option>
                  <option value="Ingestion">Ingestion</option>
                  <option value="Ads">Ads Worker</option>
                  <option value="Public">Public (Webhooks)</option>
                  <option value="AsaasWorker">Asaas Worker</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-600">
                <Calendar size={16} />
                <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  className="bg-transparent focus:outline-none text-sm font-medium cursor-pointer"
                >
                  <option value="today">Hoje (1h)</option>
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">{source === 'system' ? 'Level / Serviço' : 'Ator / Ação'}</th>
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
                      Nenhum registro encontrado no período selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any, idx: number) => {
                    const timestamp = log.timestamp || log.created_at;
                    const message = log.message || log.new_state || 'Sem detalhes';
                    const level = log.level || log.action;
                    const isError = level === 'ERROR' || level?.includes('ERROR');

                    return (
                      <tr key={log.sk || idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={14} />
                            <span className="text-xs">{new Date(timestamp).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {level}
                          </span>
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            {log.service || log.target_id || log.actor || 'System'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 max-w-md">
                            {source === 'system' ? <Terminal size={14} className="text-slate-400 mt-0.5 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 mt-0.5 shrink-0" />}
                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                              {message}
                            </p>
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
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Terminal size={20} className="text-slate-400" />
                  Visualização de Log
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">{selectedLog.request_id || 'ID Indisponível'}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 hover:bg-white border border-slate-200 rounded-xl transition-all text-sm font-medium"
              >
                Fechar
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/30">
              <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm leading-relaxed overflow-x-auto shadow-inner border border-slate-800">
                <div className="text-slate-500 mb-4 pb-4 border-b border-slate-800">
                  <span className="text-emerald-500">// {new Date(selectedLog.timestamp || selectedLog.created_at).toLocaleString()}</span>
                  <br />
                  <span className="text-blue-400"># Origin:</span> {selectedLog.service || selectedLog.target_id || 'System'}
                  <br />
                  <span className="text-purple-400"># Action:</span> {selectedLog.level || selectedLog.action}
                </div>
                <div className="text-slate-300 whitespace-pre-wrap">
                  {selectedLog.message || selectedLog.new_state}
                </div>
                {selectedLog.old_state && (
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <span className="text-amber-400">// Estado Anterior:</span>
                    <pre className="mt-2 text-slate-400 text-xs">
                      {selectedLog.old_state}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
