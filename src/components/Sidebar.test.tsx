import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { expect, test, vi, describe, beforeEach } from 'vitest';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock useAuthStore
vi.mock('../store/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('Sidebar Component', () => {
  const mockPush = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useAuthStore).mockReturnValue({ logout: mockLogout } as any);
  });

  test('renders all menu links', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Visão Geral')).toBeDefined();
    expect(screen.getByText('Gestão de Tenants')).toBeDefined();
    expect(screen.getByText('Planos')).toBeDefined();
    expect(screen.getByText('Monitoramento')).toBeDefined();
  });

  test('calls logout and redirects when "Sair do Sistema" is clicked', () => {
    render(<Sidebar />);
    
    const logoutButton = screen.getByRole('button', { name: /Sair do Sistema/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  test('highlights active link based on pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/tenants');
    
    render(<Sidebar />);
    
    const tenantsLink = screen.getByRole('link', { name: /Gestão de Tenants/i });
    expect(tenantsLink.className).toContain('bg-primary-50');
    expect(tenantsLink.className).toContain('text-primary-700');
  });

  test('opens and closes mobile menu', () => {
    render(<Sidebar />);
    
    const menuButton = screen.getByLabelText(/Abrir menu/i);
    fireEvent.click(menuButton);
    
    // After opening, the button label should change (if implemented that way)
    expect(screen.getByLabelText(/Fechar menu/i)).toBeDefined();
    
    // Aside should have translate-x-0 class
    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('translate-x-0');
  });

  test('keyboard navigation: links are focusable', () => {
    render(<Sidebar />);
    
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      link.focus();
      expect(document.activeElement).toBe(link);
    });
  });
});
