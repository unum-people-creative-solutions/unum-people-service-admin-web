import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ServiceAgreementCard } from './ServiceAgreementCard';
import { Tenant } from '@/types/tenant';

const baseTenant: Tenant = {
  id: 't-123',
  api_key: 'key',
  nome_negocio: 'Test',
  email_contato: 'test@test.com',
  documento: '123',
  nicho: 'Test',
  use_mcc_auth: false,
  status: 'ativo',
  plan_id: 'lp_basico',
  plan_value: 100,
  plan_cycle: 'mensal',
  activated_at: '',
  next_billing_at: '',
  renewal_at: '',
  is_blocked: false,
  created_at: '',
};

describe('ServiceAgreementCard', () => {
  it('exibe "Pendente" quando o status do aceite é pendente', () => {
    const tenant = { ...baseTenant, agreement: { tenant_id: 't-123', term_id: 'term-1', required_version: 2, status: 'pendente' as const } };
    render(<ServiceAgreementCard tenant={tenant} />);
    expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
  });

  it('exibe quem aceitou e quando, quando o status é aceito', () => {
    const tenant = {
      ...baseTenant,
      agreement: {
        tenant_id: 't-123',
        term_id: 'term-1',
        required_version: 2,
        status: 'aceito' as const,
        accepted_version: 2,
        accepted_by: 'admin@empresa.com',
        accepted_at: '2026-01-15T10:00:00Z',
      },
    };
    render(<ServiceAgreementCard tenant={tenant} />);
    expect(screen.getByText(/admin@empresa\.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Aceito em.*\(v2\).*por/)).toBeInTheDocument();
  });

  it('exibe o nome do termo e a versão exigida', () => {
    const tenant = {
      ...baseTenant,
      agreement: {
        tenant_id: 't-123',
        term_id: 'term-1',
        term_name: 'Termo Pacote Site',
        required_version: 3,
        status: 'pendente' as const,
      },
    };
    render(<ServiceAgreementCard tenant={tenant} />);
    expect(screen.getByText('Termo Pacote Site')).toBeInTheDocument();
    expect(screen.getByText(/Versão exigida: v3/)).toBeInTheDocument();
  });

  it('exibe o link para o Termo de Contratação quando document_url está presente', () => {
    const tenant = {
      ...baseTenant,
      agreement: {
        tenant_id: 't-123',
        term_id: 'term-1',
        term_name: 'Termo Pacote Site',
        document_url: 'https://cdn.unumpeople.com.br/terms/term-1/v3.html',
        required_version: 3,
        status: 'pendente' as const,
      },
    };
    render(<ServiceAgreementCard tenant={tenant} />);
    const link = screen.getByRole('link', { name: /Ver Termo de Contratação/i });
    expect(link).toHaveAttribute('href', 'https://cdn.unumpeople.com.br/terms/term-1/v3.html');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('não exibe link quando document_url ainda não está disponível (termo sem versão publicada)', () => {
    const tenant = {
      ...baseTenant,
      agreement: { tenant_id: 't-123', term_id: 'term-1', required_version: 0, status: 'pendente' as const },
    };
    render(<ServiceAgreementCard tenant={tenant} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('exibe estado neutro quando o tenant não tem nenhum registro de aceite (legado)', () => {
    const tenant = { ...baseTenant, agreement: undefined };
    render(<ServiceAgreementCard tenant={tenant} />);
    expect(screen.getByText(/Pendente/i)).toBeInTheDocument();
  });

  it('não expõe nenhum controle de aceite — a ação é exclusiva do TenantAdmin, não do operador interno', () => {
    const tenant = { ...baseTenant, agreement: { tenant_id: 't-123', term_id: 'term-1', required_version: 1, status: 'pendente' as const } };
    render(<ServiceAgreementCard tenant={tenant} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
