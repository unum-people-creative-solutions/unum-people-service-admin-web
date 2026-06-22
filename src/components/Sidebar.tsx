'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Tag,
  AlertCircle,
  Settings,
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';

const menuItems = [
  {
    title: 'Visão Geral',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Gestão de Tenants',
    href: '/tenants',
    icon: Users,
  },
  {
    title: 'Planos',
    href: '/plans',
    icon: Tag,
  },
  {
    title: 'Monitoramento',
    href: '/dashboard/errors',
    icon: AlertCircle,
  },
  {
    title: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md border border-slate-200"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen transition-transform bg-white border-r border-slate-200 w-64 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-100">
            <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <Image 
                src="/images/logo_texto.png" 
                alt="Unum People Logo" 
                width={120} 
                height={26} 
                className="object-contain"
              />
            </Link>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    isActive 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon 
                      size={20} 
                      className={cn(
                        "transition-colors",
                        isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600"
                      )} 
                    />
                    {item.title}
                  </div>
                  {isActive && <ChevronRight size={14} className="text-primary-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Section */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors group"
            >
              <LogOut size={20} className="text-slate-400 group-hover:text-red-500" />
              Sair do Sistema
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
