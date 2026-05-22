'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/login') {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!isAdmin) {
        // Se autenticado mas não é admin, redireciona para login com erro ou página de acesso negado
        router.push('/login?error=unauthorized');
      }
    }
  }, [isAuthenticated, isAdmin, router, pathname]);

  // Se não estiver no login e não for admin, não renderiza nada enquanto redireciona
  if (pathname !== '/login' && (!isAuthenticated || !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
