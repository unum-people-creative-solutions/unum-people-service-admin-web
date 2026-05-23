'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isProtectedRoute = pathname !== '/login';

  useEffect(() => {
    if (isProtectedRoute && hasHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        // Se autenticado mas não é admin, redireciona para login com erro ou página de acesso negado
        router.push('/login?error=unauthorized');
      }
    }
  }, [isAuthenticated, isAdmin, router, isProtectedRoute, hasHydrated]);

  // Se não estiver no login, aguarda hidratacao/redirecionamento sem montar a rota protegida.
  if (isProtectedRoute && (!hasHydrated || !isAuthenticated || !isAdmin)) {
    return (
      <div
        role="status"
        aria-label="Validando sessao"
        className="flex items-center justify-center min-h-screen bg-slate-50"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" aria-hidden="true"></div>
      </div>
    );
  }

  return <>{children}</>;
}
