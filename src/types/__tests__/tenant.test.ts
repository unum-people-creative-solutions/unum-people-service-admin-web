import { describe, it, expect } from 'vitest';
import { Tenant } from '../tenant';

describe('Tenant Type Definition', () => {
  it('should have asaas_subscription_id and delinquency_since properties (RED state)', () => {
    // This will cause a TypeScript compilation error (tsc) because the properties
    // do not exist yet on the Tenant type, achieving the RED state.
    const tenant: Tenant = {
      id: '123',
      api_key: 'abc',
      nome_negocio: 'Test',
      email_contato: 'test@test.com',
      documento: '123',
      nicho: 'Test',
      use_mcc_auth: false,
      status: 'ativo',
      plan_id: '456',
      plan_value: 100,
      plan_cycle: 'mensal',
      activated_at: '2023-01-01',
      next_billing_at: '2023-02-01',
      renewal_at: '2023-02-01',
      is_blocked: false,
      created_at: '2023-01-01',
      
      // These properties should be optional, but we test assigning them to ensure they exist on the type
      asaas_subscription_id: 'sub_12345',
      delinquency_since: '2023-02-05'
    };

    // Acessar as propriedades explicitamente para validar tipo:
    const asaasId: string | undefined = tenant.asaas_subscription_id;
    const delinquency: string | Date | undefined = tenant.delinquency_since;

    expect(asaasId).toBe('sub_12345');
    expect(delinquency).toBe('2023-02-05');
  });
});
