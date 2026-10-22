import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import FlagsPage from './page';
import { flagsService } from '@/services/flagsService';

vi.mock('@/services/flagsService', () => ({
  flagsService: { listar: vi.fn(), atualizar: vi.fn() },
}));

const listar = flagsService.listar as Mock;
const atualizar = flagsService.atualizar as Mock;

function flagsDeExemplo() {
  return [
    {
      chave: 'demonstracao',
      descricao: 'Sem efeito: prova o fluxo ponta a ponta',
      apps: ['lp-builder'],
      estado: 'desligada' as const,
    },
    {
      chave: 'amostra',
      descricao: 'Segunda flag de exemplo, com data de atualização',
      apps: ['lp-builder'],
      estado: 'teste' as const,
      atualizado_em: '2026-10-21T15:00:00Z',
    },
  ];
}

function grupoDaFlag(chave: string) {
  return screen.getByRole('group', { name: chave });
}

function radioDaFlag(chave: string, nome: 'Desligada' | 'Só teste' | 'Ligada') {
  return within(grupoDaFlag(chave)).getByRole('radio', { name: nome });
}

async function montarPagina(): Promise<void> {
  render(<FlagsPage />);
  await screen.findByRole('group', { name: 'demonstracao' });
}

describe('Página de flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listar.mockResolvedValue(flagsDeExemplo());
    // O PUT real devolve a FlagVisao atualizada (contrato de flags_handler.go).
    atualizar.mockImplementation(async (chave: string, estado: string) => ({
      ...flagsDeExemplo().find((f) => f.chave === chave)!,
      estado,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('lista descrição, apps e o radio do estado atual marcado', async () => {
    await montarPagina();

    expect(screen.getByRole('heading', { level: 1, name: 'Flags' })).toBeInTheDocument();

    const demonstracao = grupoDaFlag('demonstracao');
    expect(within(demonstracao).getByText('Sem efeito: prova o fluxo ponta a ponta')).toBeInTheDocument();
    expect(within(demonstracao).getByText('Apps: lp-builder')).toBeInTheDocument();
    expect(radioDaFlag('demonstracao', 'Desligada')).toBeChecked();
    expect(radioDaFlag('demonstracao', 'Só teste')).not.toBeChecked();
    expect(radioDaFlag('demonstracao', 'Ligada')).not.toBeChecked();

    const amostra = grupoDaFlag('amostra');
    expect(
      within(amostra).getByText('Segunda flag de exemplo, com data de atualização'),
    ).toBeInTheDocument();
    expect(within(amostra).getByText('Apps: lp-builder')).toBeInTheDocument();
    expect(radioDaFlag('amostra', 'Só teste')).toBeChecked();
    expect(radioDaFlag('amostra', 'Desligada')).not.toBeChecked();
    expect(radioDaFlag('amostra', 'Ligada')).not.toBeChecked();
  });

  it('mostra que a mudança vale em até 1 minuto', async () => {
    await montarPagina();

    expect(screen.getByText('A mudança vale em até 1 minuto.')).toBeInTheDocument();
  });

  it('chama atualizar direto ao escolher Só teste', async () => {
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));

    await waitFor(() => {
      expect(atualizar).toHaveBeenCalledTimes(1);
    });
    expect(atualizar).toHaveBeenCalledWith('demonstracao', 'teste');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('abre o diálogo ao escolher Ligada e cancelar não chama a API', async () => {
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Ligada'));

    const dialogo = await screen.findByRole('alertdialog');
    expect(dialogo).toHaveTextContent('Ligar para todos os clientes?');
    expect(within(dialogo).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(atualizar).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(atualizar).not.toHaveBeenCalled();
    expect(radioDaFlag('demonstracao', 'Desligada')).toBeChecked();
    expect(radioDaFlag('demonstracao', 'Ligada')).not.toBeChecked();
  });

  it('confirma Ligada chamando atualizar uma vez e deixa o radio marcado', async () => {
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Ligada'));

    const dialogo = await screen.findByRole('alertdialog');
    expect(atualizar).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(atualizar).toHaveBeenCalledTimes(1);
    });
    expect(atualizar).toHaveBeenCalledWith('demonstracao', 'ligada');

    await waitFor(() => {
      expect(radioDaFlag('demonstracao', 'Ligada')).toBeChecked();
    });
    expect(radioDaFlag('demonstracao', 'Desligada')).not.toBeChecked();
    expect(radioDaFlag('demonstracao', 'Só teste')).not.toBeChecked();
  });

  it('volta o radio e mostra alerta quando a gravação falha', async () => {
    atualizar.mockRejectedValue(new Error('falha ao gravar'));
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gravar a flag demonstracao.');

    await waitFor(() => {
      expect(radioDaFlag('demonstracao', 'Desligada')).toBeChecked();
    });
    expect(radioDaFlag('demonstracao', 'Só teste')).not.toBeChecked();
    expect(radioDaFlag('demonstracao', 'Ligada')).not.toBeChecked();
  });

  it('desabilita os radios da flag enquanto a gravação está pendente', async () => {
    let concluir: () => void = () => {};
    atualizar.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          concluir = () => resolve();
        }),
    );
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));

    await waitFor(() => {
      expect(radioDaFlag('demonstracao', 'Desligada')).toBeDisabled();
      expect(radioDaFlag('demonstracao', 'Só teste')).toBeDisabled();
      expect(radioDaFlag('demonstracao', 'Ligada')).toBeDisabled();
    });

    expect(radioDaFlag('amostra', 'Desligada')).toBeEnabled();
    expect(radioDaFlag('amostra', 'Só teste')).toBeEnabled();
    expect(radioDaFlag('amostra', 'Ligada')).toBeEnabled();

    concluir();

    await waitFor(() => {
      expect(radioDaFlag('demonstracao', 'Desligada')).toBeEnabled();
    });
  });

  it('mostra alerta quando o carregamento falha', async () => {
    listar.mockRejectedValue(new Error('falha ao carregar'));
    render(<FlagsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as flags.');
  });

  it('mostra Atualizado em somente na flag que tem data', async () => {
    await montarPagina();

    expect(within(grupoDaFlag('amostra')).getByText(/^Atualizado em/)).toBeInTheDocument();
    expect(within(grupoDaFlag('demonstracao')).queryByText(/^Atualizado em/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Atualizado em/)).toHaveLength(1);
  });

  // Lacuna achada por mutante: depois de gravar, a mesma flag aceita outra mudança.
  it('depois de uma gravação concluída, a mesma flag aceita uma nova mudança', async () => {
    atualizar.mockImplementation(async (chave: string, estado: string) => ({
      chave,
      estado,
      descricao: 'Sem efeito: prova o fluxo ponta a ponta',
      apps: ['lp-builder'],
    }));
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));
    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(radioDaFlag('demonstracao', 'Só teste')).not.toBeDisabled());

    fireEvent.click(radioDaFlag('demonstracao', 'Desligada'));

    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(2));
    expect(atualizar).toHaveBeenNthCalledWith(1, 'demonstracao', 'teste');
    expect(atualizar).toHaveBeenNthCalledWith(2, 'demonstracao', 'desligada');
  });

  // Achados do Verifier da fase 3 (rodada 1).
  it('com uma flag gravando, mexer em outra não reabilita os radios da primeira', async () => {
    atualizar.mockImplementation(() => new Promise(() => {}));
    await montarPagina();

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));
    await waitFor(() => expect(radioDaFlag('demonstracao', 'Ligada')).toBeDisabled());
    fireEvent.click(radioDaFlag('amostra', 'Desligada'));
    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(2));

    expect(radioDaFlag('demonstracao', 'Ligada')).toBeDisabled();
    expect(radioDaFlag('demonstracao', 'Desligada')).toBeDisabled();
    expect(radioDaFlag('amostra', 'Ligada')).toBeDisabled();
  });

  it('usa a flag que o PUT devolve: a data aparece sem recarregar', async () => {
    atualizar.mockResolvedValue({
      chave: 'demonstracao',
      descricao: 'Sem efeito: prova o fluxo ponta a ponta',
      apps: ['lp-builder'],
      estado: 'teste',
      atualizado_em: '2026-10-21T16:00:00Z',
      atualizado_por: 'sub-op',
    });
    await montarPagina();
    expect(within(grupoDaFlag('demonstracao')).queryByText(/^Atualizado em/)).not.toBeInTheDocument();

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));

    expect(await within(grupoDaFlag('demonstracao')).findByText(/^Atualizado em/)).toBeInTheDocument();
  });

  it('flag com apps ausente (null) na resposta não derruba a página', async () => {
    listar.mockResolvedValue([{ chave: 'sem-apps', descricao: 'd', apps: null, estado: 'desligada' }]);
    render(<FlagsPage />);

    expect(await screen.findByRole('group', { name: 'sem-apps' })).toBeInTheDocument();
  });

  // Fechamento do modo teste, item C: um alerta de erro POR flag.
  const MSG_A = 'Não foi possível gravar a flag demonstracao.';
  const MSG_B = 'Não foi possível gravar a flag amostra.';

  async function falharAsDuasFlags() {
    atualizar.mockRejectedValue(new Error('rede caiu'));
    await montarPagina();
    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));
    fireEvent.click(radioDaFlag('amostra', 'Desligada'));
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  }

  it('duas flags que falham ao mesmo tempo mostram dois alertas, cada um no seu cartão', async () => {
    await falharAsDuasFlags();

    expect(within(grupoDaFlag('demonstracao')).getByRole('alert')).toHaveTextContent(MSG_A);
    expect(within(grupoDaFlag('amostra')).getByRole('alert')).toHaveTextContent(MSG_B);
  });

  it('gravar outra flag com sucesso não apaga o alerta da que falhou', async () => {
    atualizar.mockRejectedValueOnce(new Error('rede caiu'));
    await montarPagina();
    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));
    expect(await within(grupoDaFlag('demonstracao')).findByRole('alert')).toHaveTextContent(MSG_A);

    fireEvent.click(radioDaFlag('amostra', 'Desligada'));
    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(radioDaFlag('amostra', 'Desligada')).toBeChecked());

    expect(within(grupoDaFlag('demonstracao')).getByRole('alert')).toHaveTextContent(MSG_A);
  });

  it('gravar com sucesso uma flag limpa só o alerta dela', async () => {
    await falharAsDuasFlags();
    atualizar.mockResolvedValueOnce({
      chave: 'demonstracao',
      descricao: 'Sem efeito: prova o fluxo ponta a ponta',
      apps: ['lp-builder'],
      estado: 'teste',
    });

    fireEvent.click(radioDaFlag('demonstracao', 'Só teste'));

    await waitFor(() => expect(within(grupoDaFlag('demonstracao')).queryByRole('alert')).not.toBeInTheDocument());
    expect(within(grupoDaFlag('amostra')).getByRole('alert')).toHaveTextContent(MSG_B);
  });

  it('abrir a confirmação de "Ligada" numa flag limpa só o alerta dela', async () => {
    await falharAsDuasFlags();

    fireEvent.click(radioDaFlag('demonstracao', 'Ligada'));

    await waitFor(() => expect(within(grupoDaFlag('demonstracao')).queryByRole('alert')).not.toBeInTheDocument());
    expect(within(grupoDaFlag('demonstracao')).getByRole('alertdialog')).toBeInTheDocument();
    expect(within(grupoDaFlag('amostra')).getByRole('alert')).toHaveTextContent(MSG_B);
  });
});
