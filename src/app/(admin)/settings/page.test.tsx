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

describe('SettingsPage - E-mail de contato push (VAPID)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    (settingsService.getSettings as Mock).mockResolvedValue({
      settings: {
        institutional_email: 'noreply@unumpeople.com.br',
        redirection_email: 'unumpeople@gmail.com',
        vapid_email: 'mailto:notification@unumpeople.com.br',
        operator_email: 'admin@unumpeople.com.br',
      },
      dns: { domain: 'unumpeople.com.br' },
    });
  });

  async function abrir() {
    render(<SettingsPage />);
    await screen.findByRole('heading', { name: /configurações globais/i });
    return {
      vapid: screen.getByLabelText(/E-mail de contato push/i),
      salvar: screen.getByRole('button', { name: /salvar alterações/i }),
    };
  }

  it('mostra só o e-mail, sem mailto:, mesmo quando o valor salvo tem o prefixo', async () => {
    const { vapid } = await abrir();

    expect(vapid).toHaveValue('notification@unumpeople.com.br');
    expect(vapid).toHaveAttribute('type', 'email');
    expect(screen.getByText(/só o e-mail, sem mailto:/i)).toBeInTheDocument();
  });

  it('salva só o e-mail', async () => {
    const { salvar } = await abrir();

    fireEvent.click(salvar);

    await waitFor(() => {
      expect(settingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ vapid_email: 'notification@unumpeople.com.br' }),
      );
    });
  });

  it('o navegador recusa valor com mailto: (campo de e-mail) e nada é salvo', async () => {
    const { vapid, salvar } = await abrir();

    fireEvent.change(vapid, { target: { value: 'mailto:outro@unumpeople.com.br' } });
    fireEvent.click(salvar);

    expect((vapid as HTMLInputElement).validity.valid).toBe(false);
    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('recusa valor com mailto: com erro acessível e não salva', async () => {
    const { vapid, salvar } = await abrir();

    fireEvent.change(vapid, { target: { value: 'mailto:outro@unumpeople.com.br' } });
    fireEvent.submit(salvar.closest('form')!);

    expect(await screen.findByText(/informe só o e-mail, sem mailto:/i)).toBeInTheDocument();
    expect(vapid).toHaveAttribute('aria-invalid', 'true');
    expect(vapid).toHaveAccessibleErrorMessage(/informe só o e-mail, sem mailto:/i);
    expect(settingsService.updateSettings).not.toHaveBeenCalled();
  });

  it('o exemplo do redirecionamento é um endereço do Gmail válido', async () => {
    await abrir();

    expect(screen.getByLabelText(/E-mail de Redirecionamento/i)).not.toHaveAttribute(
      'placeholder',
      expect.stringMatching(/gmail\.com\.br/),
    );
  });
});
