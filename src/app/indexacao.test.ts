import { describe, it, expect, vi } from 'vitest';

// O layout raiz carrega fonte e componentes; para ler só os metadados, basta simulá-los.
vi.mock('next/font/google', () => ({
  Poppins: () => ({ variable: '--font-poppins-mock', className: 'poppins-mock-class' }),
}));
vi.mock('@/components/auth/AuthGuard', () => ({ default: () => null }));
vi.mock('@/components/Providers', () => ({ default: () => null }));

import { metadata } from './layout';

describe('indexação do painel admin', () => {
  it('todas as páginas pedem para não indexar nem seguir links', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
