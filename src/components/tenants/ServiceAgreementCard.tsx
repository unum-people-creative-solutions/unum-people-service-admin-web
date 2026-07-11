import React from 'react';
import { Tenant } from '@/types/tenant';

interface ServiceAgreementCardProps {
  tenant: Tenant;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function ServiceAgreementCard({ tenant }: ServiceAgreementCardProps) {
  const agreement = tenant.agreement;
  const isAccepted = agreement?.status === 'aceito';

  return (
    <div className="p-4 border rounded shadow-sm bg-white" data-testid="service-agreement-card">
      <h2 className="text-lg font-semibold mb-4">Termo de Contratação</h2>
      {agreement?.term_name && (
        <p className="text-sm text-slate-700 font-medium">{agreement.term_name}</p>
      )}
      <p className="text-xs text-slate-500 mb-1">Versão exigida: v{agreement?.required_version}</p>
      {agreement?.document_url && (
        <a
          href={agreement.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 text-xs underline mb-2 inline-block"
        >
          Ver Termo de Contratação
        </a>
      )}
      {isAccepted ? (
        <div>
          <p className="text-green-600">
            Aceito em {formatDate(agreement?.accepted_at)} (v{agreement?.accepted_version}) por {agreement?.accepted_by}
          </p>
        </div>
      ) : (
        <p className="text-yellow-600">Pendente</p>
      )}
    </div>
  );
}
