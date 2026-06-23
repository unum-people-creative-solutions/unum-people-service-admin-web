import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import SettingsPage from './page';
import { settingsService } from '@/services/settingsService';

vi.mock('@/services/settingsService', () => ({
  settingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock('@/lib/cognito', () => ({
  userPool: {}
}));

describe('SettingsPage - E-mail do operador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    
    (settingsService.getSettings as Mock).mockResolvedValue({
      settings: {
        institutional_email: 'noreply@unumpeople.com.br',
        redirection_email: 'unumpeople@gmail.com',
        vapid_email: 'mailto:noreply@unumpeople.com.br',
        operator_email: '', 
      },
      dns: { domain: 'unumpeople.com.br' }
    });
  });

  it('deve existir o campo E-mail do operador', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /configurações globais/i })).toBeInTheDocument();
    });

    const operatorInput = screen.getByLabelText(/E-mail do operador/i);
    expect(operatorInput).toBeInTheDocument();
  });

  it('deve exibir erro de validação acessível se o e-mail for inválido', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /configurações globais/i })).toBeInTheDocument();
    });

    const operatorInput = screen.getByLabelText(/E-mail do operador/i);
    const submitButton = screen.getByRole('button', { name: /salvar alterações/i });

    fireEvent.change(operatorInput, { target: { value: 'email-invalido' } });
    fireEvent.click(submitButton);

    const errorMessage = await screen.findByText(/e-mail inválido/i);
    expect(errorMessage).toBeInTheDocument();
    expect(operatorInput).toHaveAttribute('aria-invalid', 'true');
    expect(operatorInput).toHaveAccessibleErrorMessage(/e-mail inválido/i);

    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('deve submeter a requisição corretamente com e-mail válido', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /configurações globais/i })).toBeInTheDocument();
    });

    const operatorInput = screen.getByLabelText(/E-mail do operador/i);
    const submitButton = screen.getByRole('button', { name: /salvar alterações/i });

    fireEvent.change(operatorInput, { target: { value: 'operador@unumpeople.com.br' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(settingsService.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
        operator_email: 'operador@unumpeople.com.br'
      }));
    });
  });
});
