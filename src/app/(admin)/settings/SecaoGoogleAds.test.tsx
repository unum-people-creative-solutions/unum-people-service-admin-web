import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { googleAdsService } from '@/services/googleAdsService';
import SecaoGoogleAds from './SecaoGoogleAds';
import { ApiError } from '@/lib/apiError';

vi.mock('@/services/googleAdsService', () => ({
  googleAdsService: {
    obter: vi.fn(),
    atualizarMcc: vi.fn(),
  },
}));

const CONTA = {
  conectado: true,
  email: 'ads@unumpeople.com.br',
  conectado_em: '2026-10-22T18:30:00Z',
  mcc_customer_id: '',
  tenants_usando: 3,
};

const FORMATO = 'Use o formato 000-000-0000.';

function mockConectada(parcial: Partial<typeof CONTA> = {}) {
  vi.mocked(googleAdsService.obter).mockResolvedValue({ ...CONTA, ...parcial });
}

describe('SecaoGoogleAds', () => {
  beforeEach(() => {
    vi.mocked(googleAdsService.obter).mockReset();
    vi.mocked(googleAdsService.atualizarMcc).mockReset();
  });

  it('mostra a conta conectada com e-mail, a MCC vazia e os tenants', async () => {
    mockConectada();

    render(<SecaoGoogleAds />);

    expect(
      await screen.findByText('Conectada como ads@unumpeople.com.br em 22/10/2026 15:30'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Google Ads' })).toBeInTheDocument();
    expect(screen.getByLabelText('ID da MCC')).toHaveValue('');
    expect(screen.getByText('Tenants usando a autenticação MCC: 3')).toBeInTheDocument();
    expect(
      screen.getByText('Como conectar: pela tela de tenants do CRM, com o perfil GlobalAdmin.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Não conectada.')).not.toBeInTheDocument();
    expect(screen.queryByText(/conta não identificada/)).not.toBeInTheDocument();
    expect(googleAdsService.obter).toHaveBeenCalledTimes(1);
  });

  it('mostra conta não identificada quando conectada sem e-mail', async () => {
    mockConectada({ email: '' });

    render(<SecaoGoogleAds />);

    expect(
      await screen.findByText(
        'Conectada (conta não identificada). Reconecte pela tela de tenants do CRM para registrar a conta.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Conectada como/)).not.toBeInTheDocument();
    expect(screen.queryByText('Não conectada.')).not.toBeInTheDocument();
  });

  it('mostra Não conectada quando não há conta', async () => {
    mockConectada({ conectado: false, email: '', conectado_em: '' });

    render(<SecaoGoogleAds />);

    expect(await screen.findByText('Não conectada.')).toBeInTheDocument();
    expect(screen.queryByText(/conta não identificada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Conectada como/)).not.toBeInTheDocument();
  });

  it('mostra alerta quando falha ao carregar', async () => {
    vi.mocked(googleAdsService.obter).mockRejectedValue(new Error('falha'));

    render(<SecaoGoogleAds />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a configuração do Google Ads.',
    );
  });

  it('recusa formato inválido, liga a mensagem ao campo e limpa ao digitar', async () => {
    mockConectada();

    render(<SecaoGoogleAds />);

    const campo = await screen.findByLabelText('ID da MCC');
    fireEvent.change(campo, { target: { value: '123-45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription(expect.stringContaining(FORMATO));
    expect(googleAdsService.atualizarMcc).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: '123-456' } });

    expect(campo).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(FORMATO)).not.toBeInTheDocument();
  });

  it('salva a MCC válida, desabilita o botão enquanto envia e confirma', async () => {
    mockConectada();
    let resolveSave: (valor: typeof CONTA) => void = () => {};
    const pendente = new Promise<typeof CONTA>((resolve) => {
      resolveSave = resolve;
    });
    vi.mocked(googleAdsService.atualizarMcc).mockReturnValue(pendente);

    render(<SecaoGoogleAds />);

    const campo = await screen.findByLabelText('ID da MCC');
    fireEvent.change(campo, { target: { value: '631-981-8479' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const salvando = await screen.findByRole('button', { name: 'Salvando…' });
    expect(salvando).toBeDisabled();
    expect(googleAdsService.atualizarMcc).toHaveBeenCalledTimes(1);
    expect(googleAdsService.atualizarMcc).toHaveBeenCalledWith('631-981-8479');

    resolveSave({ ...CONTA, mcc_customer_id: '631-981-8479' });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('MCC salva.');
    });
    expect(screen.getByLabelText('ID da MCC')).toHaveValue('631-981-8479');
  });

  it('aceita a MCC vazia', async () => {
    mockConectada();
    vi.mocked(googleAdsService.atualizarMcc).mockResolvedValue({ ...CONTA });

    render(<SecaoGoogleAds />);

    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(googleAdsService.atualizarMcc).toHaveBeenCalledWith('');
    });
    expect(googleAdsService.atualizarMcc).toHaveBeenCalledTimes(1);
  });

  it('marca o campo quando a API responde invalid_field sem alerta', async () => {
    mockConectada();
    // formato real do cliente do admin (apiFetch lança ApiError com status e corpo)
    vi.mocked(googleAdsService.atualizarMcc).mockRejectedValue(
      new ApiError('invalid_field', 400, { error: 'invalid_field', field: 'mcc_customer_id' }),
    );

    render(<SecaoGoogleAds />);

    const campo = await screen.findByLabelText('ID da MCC');
    fireEvent.change(campo, { target: { value: '631-981-8479' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(campo).toHaveAttribute('aria-invalid', 'true');
    });
    expect(campo).toHaveAccessibleDescription(expect.stringContaining(FORMATO));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra alerta quando falha ao salvar', async () => {
    mockConectada();
    vi.mocked(googleAdsService.atualizarMcc).mockRejectedValue(new Error('falha'));

    render(<SecaoGoogleAds />);

    const campo = await screen.findByLabelText('ID da MCC');
    fireEvent.change(campo, { target: { value: '631-981-8479' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar a MCC.');
    expect(campo).not.toHaveAttribute('aria-invalid', 'true');
  });
});
