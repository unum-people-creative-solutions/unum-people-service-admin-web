import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { Invoice } from '@/types/tenant';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';

interface TenantInvoicesSectionProps {
  tenantId: string;
}

const statusLabels: Record<Invoice['status'], string> = {
  SCHEDULED: 'Agendada',
  SYNCHRONIZED: 'Sincronizada',
  AUTHORIZED: 'Autorizada',
  ERROR: 'Erro',
};

const statusStyles: Record<Invoice['status'], string> = {
  SCHEDULED: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  SYNCHRONIZED: 'bg-blue-50 text-blue-700 border border-blue-200',
  AUTHORIZED: 'bg-green-50 text-green-700 border border-green-200',
  ERROR: 'bg-red-50 text-red-700 border border-red-200',
};

export function TenantInvoicesSection({ tenantId }: TenantInvoicesSectionProps) {
  const { data: invoices = [], isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['tenant-invoices', tenantId],
    queryFn: () => tenantService.listInvoices(tenantId),
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mt-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notas Fiscais</h2>
          <p className="text-slate-500 text-sm">Histórico de notas fiscais de serviço (NFS-e) geradas para este tenant.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : error ? (
        <div className="text-red-500 py-4 text-center">
          Erro ao carregar notas fiscais.
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
          Nenhuma nota fiscal encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-xs uppercase text-slate-700">
              <tr>
                <th scope="col" className="px-6 py-3">ID da Nota</th>
                <th scope="col" className="px-6 py-3">Data Agendada</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Detalhes</th>
                <th scope="col" className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border-t border-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.asaas_invoice_id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {invoice.asaas_invoice_id}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.effective_date ? new Date(invoice.effective_date).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[invoice.status]}`}>{statusLabels[invoice.status]}</span>
                  </td>
                  <td className="px-6 py-4">
                    {invoice.status === 'ERROR' && invoice.error_reason ? (
                      <span className="text-red-600 text-xs flex items-center gap-1"><AlertTriangle size={14} />{invoice.error_reason}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.status === 'AUTHORIZED' && invoice.pdf_url ? (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 font-medium flex items-center gap-1 transition-colors"
                      ><FileText size={16} />Visualizar PDF</a>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
