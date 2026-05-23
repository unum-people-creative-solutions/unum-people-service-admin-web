'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { AlertCircle, Clock, RefreshCw, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ErrorsPage() {
  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-logs-errors'],
    queryFn: tenantService.getLogs,
  });

  // Filtrar apenas erros (ações que contêm "ERROR")
  const errors = logs?.filter(log => log.action.includes('ERROR')) || [];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logs de Erros</h1>
            <p className="text-slate-500">Monitoramento centralizado de falhas e exceções do sistema.</p>
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por RequestID ou Serviço..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white transition-colors">
              <Filter size={18} />
              Todos os Serviços
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Serviço / Ação</th>
                  <th className="px-6 py-4">Mensagem</th>
                  <th className="px-6 py-4">RequestID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse h-16">
                      <td colSpan={4} className="px-6 py-4 bg-slate-50/30"></td>
                    </tr>
                  ))
                ) : errors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      Nenhum erro crítico detectado no período selecionado.
                    </td>
                  </tr>
                ) : (
                  errors.map((log: any) => (
                    <tr key={log.sk} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock size={14} />
                          <span className="text-sm">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                          {log.action}
                        </span>
                        <div className="text-xs text-slate-500 mt-1 font-mono">{log.target_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-md">
                          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-slate-700 font-medium">Erro na Integração</p>
                            <p className="text-xs text-slate-500 mt-0.5 break-all">{log.new_state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {log.request_id || 'N/A'}
                        </code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-right">
            Exibindo {errors.length} erro(s) recentes.
          </div>
        </div>
      </div>
    </div>
  );
}
