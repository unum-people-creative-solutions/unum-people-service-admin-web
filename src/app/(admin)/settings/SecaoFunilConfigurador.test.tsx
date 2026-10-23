import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { funilConfiguradorService } from '@/services/funilConfiguradorService';
import { ApiError } from '@/lib/apiError';
import SecaoFunilConfigurador from './SecaoFunilConfigurador';

vi.mock('@/services/funilConfiguradorService', () => ({
  funilConfiguradorService: { obter: vi.fn(), atualizar: vi.fn() },
}));

// funil-configurador-f2 T412 (RF-20).
const VISAO = { tenant_real: 't-real', tenant_real_nome: 'Unum People', tenant_teste: '', tenant_teste_nome: '' };

describe('SecaoFunilConfigurador', () => {
  beforeEach(() => {
    vi.mocked(funilConfiguradorService.obter).mockReset();
    vi.mocked(funilConfiguradorService.atualizar).mockReset();
  });

  it('mostra os dois campos preenchidos, o nome do tenant e o texto', async () => {
    vi.mocked(funilConfiguradorService.obter).mockResolvedValue(VISAO);
    render(<SecaoFunilConfigurador />);
    expect(await screen.findByLabelText('Tenant que recebe as contratações')).toHaveValue('t-real');
    expect(screen.getByLabelText('Tenant que recebe as contratações em modo teste')).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Funil do Configurador' })).toBeInTheDocument();
    expect(screen.getByText('Unum People')).toBeInTheDocument();
    expect(screen.getByText(/Vazio desliga/)).toBeInTheDocument();
    expect(screen.getByText(/conta de testes/)).toBeInTheDocument();
  });

  it('salva os dois campos e mostra sucesso com os nomes novos', async () => {
    vi.mocked(funilConfiguradorService.obter).mockResolvedValue(VISAO);
    vi.mocked(funilConfiguradorService.atualizar).mockResolvedValue({ ...VISAO, tenant_teste: 't-teste', tenant_teste_nome: 'Loja Teste' });
    render(<SecaoFunilConfigurador />);
    fireEvent.change(await screen.findByLabelText('Tenant que recebe as contratações em modo teste'), { target: { value: ' t-teste ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Funil salvo.');
    expect(funilConfiguradorService.atualizar).toHaveBeenCalledWith('t-real', 't-teste');
    expect(screen.getByText('Loja Teste')).toBeInTheDocument();
  });

  // Verifier M-10: o nome é do tenant salvo; com outro ID digitado, some.
  it('esconde o nome do tenant enquanto o campo tem outro ID', async () => {
    vi.mocked(funilConfiguradorService.obter).mockResolvedValue(VISAO);
    render(<SecaoFunilConfigurador />);
    fireEvent.change(await screen.findByLabelText('Tenant que recebe as contratações'), { target: { value: 't-outro' } });
    expect(screen.queryByText('Unum People')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tenant que recebe as contratações'), { target: { value: ' t-real ' } });
    expect(screen.getByText('Unum People')).toBeInTheDocument();
  });

  it.each([
    ['tenant_real', 'Tenant que recebe as contratações', 'Informe um tenant que existe e não é de teste.'],
    ['tenant_teste', 'Tenant que recebe as contratações em modo teste', 'Informe um tenant de teste que existe.'],
  ])('erro de campo %s aparece junto do campo', async (campo, rotulo, mensagem) => {
    vi.mocked(funilConfiguradorService.obter).mockResolvedValue(VISAO);
    vi.mocked(funilConfiguradorService.atualizar).mockRejectedValue(new ApiError('invalid_field', 400, { error: 'invalid_field', field: campo }));
    render(<SecaoFunilConfigurador />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    expect(screen.getByLabelText(rotulo)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('erro genérico ao salvar aparece como alerta', async () => {
    vi.mocked(funilConfiguradorService.obter).mockResolvedValue(VISAO);
    vi.mocked(funilConfiguradorService.atualizar).mockRejectedValue(new ApiError('internal_error', 500, {}));
    render(<SecaoFunilConfigurador />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o funil.');
  });

  it('falha ao carregar aparece como alerta', async () => {
    vi.mocked(funilConfiguradorService.obter).mockRejectedValue(new Error('falha'));
    render(<SecaoFunilConfigurador />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o funil do Configurador.');
  });

  it('o botão fica desabilitado enquanto salva', async () => {
    vi.mocked(funilConfiguradorService.obter).mockResolvedValue(VISAO);
    let resolver: (v: typeof VISAO) => void = () => {};
    vi.mocked(funilConfiguradorService.atualizar).mockReturnValue(new Promise((r) => (resolver = r)));
    render(<SecaoFunilConfigurador />);
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    resolver(VISAO);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled());
  });
});
