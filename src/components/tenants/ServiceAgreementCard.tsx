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
