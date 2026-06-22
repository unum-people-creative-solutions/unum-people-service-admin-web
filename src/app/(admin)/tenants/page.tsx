'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';

export default function TenantsPage() {
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantService.list,
  });

  if (error) return <div className="p-8 text-red-600">Erro ao carregar tenants: {error.message}</div>;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Tenants</h1>
            <p className="text-slate-500">Gerencie contas, planos e acessos dos seus parceiros.</p>
          </div>
          <Link 
            href="/tenants/new"
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            Novo Tenant
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome, e-mail ou documento..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              <Filter size={18} />
              Filtros
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
                  <th className="px-6 py-4">Negócio / Contato</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : tenants?.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{tenant.nome_negocio}</div>
                      <div className="text-sm text-slate-500">{tenant.email_contato}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{tenant.documento}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium capitalize">{tenant.plan_id.replace('lp_', '')}</div>
                      <div className="text-xs text-slate-500">R$ {(tenant.plan_value ?? 0).toLocaleString('pt-BR')} / {tenant.plan_cycle}</div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const status = (tenant.status || '').toLowerCase();
                        const cls =
                          status === 'ativo' ? 'bg-green-100 text-green-800' :
                          status === 'inadimplente' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800';
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                            {(tenant.status || '—').toUpperCase()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/tenants/${tenant.id}`} className="text-primary-600 hover:text-primary-900 text-sm font-medium">
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
