import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { expect, test, vi, describe } from 'vitest';
import { usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

describe('Sidebar Component', () => {
  test('renders all menu links', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Visão Geral')).toBeDefined();
    expect(screen.getByText('Gestão de Tenants')).toBeDefined();
    expect(screen.getByText('Logs de Erros')).toBeDefined();
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
