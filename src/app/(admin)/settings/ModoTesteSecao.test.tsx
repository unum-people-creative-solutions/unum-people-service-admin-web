import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settingsService } from '@/services/settingsService';
import ModoTesteSecao from './ModoTesteSecao';

vi.mock('@/services/settingsService', () => ({
  settingsService: {
    obterModoTeste: vi.fn(),
    rotacionarModoTeste: vi.fn(),
    desligarModoTeste: vi.fn(),
  },
}));

const TOKEN = 't'.repeat(43);
const LINK = `https://unumpeople.app/configurar?teste=${TOKEN}`;
const ROTACIONADO_EM = '2026-10-21T12:00:00.000Z';

function mockDesligado() {
  vi.mocked(settingsService.obterModoTeste).mockResolvedValue({ ativo: false });
}

function mockAtivo() {
  vi.mocked(settingsService.obterModoTeste).mockResolvedValue({
    ativo: true,
    token: TOKEN,
    rotacionado_em: ROTACIONADO_EM,
  });
}

describe('ModoTesteSecao', () => {
  beforeEach(() => {
    vi.mocked(settingsService.obterModoTeste).mockReset();
    vi.mocked(settingsService.rotacionarModoTeste).mockReset();
    vi.mocked(settingsService.desligarModoTeste).mockReset();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('mostra Desligado sem o link', async () => {
    mockDesligado();

    render(<ModoTesteSecao />);

    expect(await screen.findByText('Desligado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Modo teste do checkout' })).toBeInTheDocument();
    expect(
      screen.getByText('Quem abrir o link contrata como teste: o tenant nasce de teste e é cobrado no sandbox do Asaas.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar token' })).toBeInTheDocument();
    expect(screen.queryByText('Ativo')).not.toBeInTheDocument();
    expect(screen.queryByText(/https:\/\/unumpeople\.app\/configurar\?teste=/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mostrar link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rotacionar token' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desligar modo teste' })).not.toBeInTheDocument();
    expect(settingsService.obterModoTeste).toHaveBeenCalledTimes(1);
  });

  it('gera o token com confirmação e deixa o link visível', async () => {
    mockDesligado();
    vi.mocked(settingsService.rotacionarModoTeste).mockResolvedValue({
      token: TOKEN,
      rotacionado_em: ROTACIONADO_EM,
    });

    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar token' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(settingsService.rotacionarModoTeste).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Ativo')).toBeInTheDocument();
    expect(await screen.findByText(LINK)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
    expect(screen.queryByText('Desligado')).not.toBeInTheDocument();
    expect(settingsService.rotacionarModoTeste).toHaveBeenCalledTimes(1);
  });

  it('mantém o link oculto, mostra o link e copia o link completo', async () => {
    mockAtivo();

    render(<ModoTesteSecao />);

    expect(await screen.findByText('Ativo')).toBeInTheDocument();
    expect(screen.queryByText(LINK)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar link' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotacionar token' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desligar modo teste' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar link' }));

    expect(await screen.findByText(LINK)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK);
    });
  });

  it('mostra o aviso ao rotacionar e o cancelar não chama a API', async () => {
    mockAtivo();

    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Rotacionar token' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(
        'O token atual deixa de funcionar na hora. Quem estiver testando precisa do link novo.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(settingsService.rotacionarModoTeste).not.toHaveBeenCalled();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('desliga o modo teste com confirmação', async () => {
    mockAtivo();
    vi.mocked(settingsService.desligarModoTeste).mockResolvedValue(undefined);

    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar link' }));
    expect(await screen.findByText(LINK)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desligar modo teste' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(settingsService.desligarModoTeste).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Desligado')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Ativo')).not.toBeInTheDocument();
      expect(screen.queryByText(LINK)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Gerar token' })).toBeInTheDocument();
    expect(settingsService.desligarModoTeste).toHaveBeenCalledTimes(1);
  });

  it('mostra alerta quando ocorre erro ao carregar', async () => {
    vi.mocked(settingsService.obterModoTeste).mockRejectedValue(new Error('falha'));

    render(<ModoTesteSecao />);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/^Não foi possível/);
  });

  it('mostra alerta quando ocorre erro ao rotacionar', async () => {
    mockAtivo();
    vi.mocked(settingsService.rotacionarModoTeste).mockRejectedValue(new Error('falha'));

    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Rotacionar token' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/^Não foi possível/);
    expect(settingsService.rotacionarModoTeste).toHaveBeenCalledTimes(1);
  });

  it('reabrir uma ação limpa o erro da tentativa anterior', async () => {
    mockAtivo();
    vi.mocked(settingsService.rotacionarModoTeste).mockRejectedValue(new Error('falha'));

    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Rotacionar token' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Não foi possível/);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desligar modo teste' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('desabilita Confirmar enquanto a promessa está pendente', async () => {
    mockDesligado();
    vi.mocked(settingsService.rotacionarModoTeste).mockReturnValue(new Promise(() => {}));

    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Gerar token' }));

    const confirmar = await screen.findByRole('button', { name: 'Confirmar' });
    expect(confirmar).toBeEnabled();

    fireEvent.click(confirmar);

    await waitFor(() => {
      expect(settingsService.rotacionarModoTeste).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    });
  });

  // Verifier, lacuna 4: copiar o link avisa quando copia e quando falha.
  it('Copiar link avisa que copiou', async () => {
    mockAtivo();
    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect(await screen.findByText('Link copiado.')).toBeInTheDocument();
  });

  it('Copiar link mostra erro quando a área de transferência recusa', async () => {
    mockAtivo();
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('negado'));
    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível copiar o link.');
  });

  // Verifier, lacuna 5: durante a chamada, nenhum botão fica inerte e habilitado.
  it('durante a chamada, Cancelar, Rotacionar e Desligar ficam desabilitados', async () => {
    mockAtivo();
    vi.mocked(settingsService.rotacionarModoTeste).mockReturnValue(new Promise(() => {}));
    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Rotacionar token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Rotacionar token' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desligar modo teste' })).toBeDisabled();
  });

  it('o aviso "Link copiado." some quando um token novo é gerado', async () => {
    mockAtivo();
    vi.mocked(settingsService.rotacionarModoTeste).mockResolvedValue({ token: 'n'.repeat(43), rotacionado_em: '2026-10-21T14:00:00Z' });
    render(<ModoTesteSecao />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText('Link copiado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rotacionar token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText(/configurar\?teste=n{43}/)).toBeInTheDocument();
    expect(screen.queryByText('Link copiado.')).not.toBeInTheDocument();
  });
});
