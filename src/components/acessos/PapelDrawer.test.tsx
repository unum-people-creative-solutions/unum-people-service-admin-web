import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { PapelDrawer } from './PapelDrawer'
import { acessoService } from '@/services/acessoService'
import { ApiError } from '@/lib/apiError'
import { crm, blog, leitor } from './fixtures'

// spec: gestao-de-acesso-f2-portal-admin RF-16, blueprint §3.1.

vi.mock('@/services/acessoService', () => ({
  acessoService: { criarPapel: vi.fn(), atualizarPapel: vi.fn(), usoDoPapel: vi.fn() },
}))

function renderizar(props: Partial<React.ComponentProps<typeof PapelDrawer>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const aoFechar = vi.fn()
  const aoSalvo = vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <PapelDrawer aberto ferramenta={crm} aoFechar={aoFechar} aoSalvo={aoSalvo} {...props} />
    </QueryClientProvider>,
  )
  return { aoFechar, aoSalvo }
}

describe('PapelDrawer', () => {
  beforeEach(() => vi.clearAllMocks())

  test('novo papel: marcar uma permissão marca o que ela requer, e salvar manda o contrato', async () => {
    vi.mocked(acessoService.criarPapel).mockResolvedValue({ ...leitor, id: 'p-novo', nome: 'Supervisor' })
    const { aoSalvo } = renderizar()
    expect(screen.getByRole('heading', { name: 'Novo papel — CRM' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Supervisor' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Excluir lead/ }))
    expect(screen.getByRole('checkbox', { name: /Ver e buscar leads/ })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar papel' }))
    await waitFor(() => expect(acessoService.criarPapel).toHaveBeenCalled())
    const enviado = vi.mocked(acessoService.criarPapel).mock.calls[0][0]
    expect(enviado.ferramenta).toBe('crm')
    expect(enviado.nome).toBe('Supervisor')
    expect([...enviado.permissoes].sort()).toEqual(['crm.lead.excluir', 'crm.lead.ver'])
    await waitFor(() => expect(aoSalvo).toHaveBeenCalled())
  })

  test('desmarcar uma permissão requerida desmarca as que dependem dela (em cadeia)', () => {
    renderizar({ ferramenta: blog })
    fireEvent.click(screen.getByRole('checkbox', { name: /Editar posts de qualquer autor/ }))
    expect(screen.getByRole('checkbox', { name: /Editar os próprios posts/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Ver posts/ })).toBeChecked()
    fireEvent.click(screen.getByRole('checkbox', { name: /Ver posts/ }))
    expect(screen.getByRole('checkbox', { name: /Editar os próprios posts/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Editar posts de qualquer autor/ })).not.toBeChecked()
  })

  test('mostra o que cada permissão requer', () => {
    renderizar({ ferramenta: blog })
    expect(screen.getByText(/requer: Editar os próprios posts/)).toBeInTheDocument()
  })

  test('salvar desabilitado diz o motivo', () => {
    renderizar()
    const salvar = screen.getByRole('button', { name: 'Salvar papel' })
    expect(salvar).toBeDisabled()
    expect(screen.getByText('Dê um nome ao papel')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'X' } })
    expect(screen.getByText('Escolha pelo menos uma permissão')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Ver e buscar leads/ }))
    expect(salvar).toBeEnabled()
  })

  test('erro da API aparece na gaveta, que continua aberta', async () => {
    vi.mocked(acessoService.criarPapel).mockRejectedValue(new ApiError('nome_em_uso', 409, { error: 'nome_em_uso' }))
    const { aoFechar } = renderizar()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Gestor' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Ver e buscar leads/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar papel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um papel com esse nome no CRM.')
    expect(aoFechar).not.toHaveBeenCalled()
  })

  test('permissao_requer lista o que falta pelo nome', async () => {
    vi.mocked(acessoService.criarPapel).mockRejectedValue(new ApiError('permissao_requer', 400, { error: 'permissao_requer', faltando: ['crm.lead.ver'] }))
    renderizar()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Ver e buscar leads/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar papel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ver e buscar leads')
  })

  test('editar: campos preenchidos, aviso de uso e PUT com o contrato', async () => {
    vi.mocked(acessoService.usoDoPapel).mockResolvedValue({ em_uso: 3, empresas: [{ tenant_id: 't1', nome_negocio: 'A', usuarios: 2 }, { tenant_id: 't2', nome_negocio: 'B', usuarios: 1 }] })
    vi.mocked(acessoService.atualizarPapel).mockResolvedValue({ ...leitor, nome: 'Leitor 2' })
    renderizar({ papel: leitor })
    expect(screen.getByRole('heading', { name: 'Editar papel — CRM' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Leitor')
    expect(screen.getByRole('checkbox', { name: /Ver e buscar leads/ })).toBeChecked()
    expect(await screen.findByText(/Em uso por 3 pessoas em 2 empresas/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Leitor 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar papel' }))
    await waitFor(() => expect(acessoService.atualizarPapel).toHaveBeenCalledWith('crm', 'p-aaaaaaaaaaaa', { nome: 'Leitor 2', descricao: 'Só lê', permissoes: ['crm.lead.ver'] }))
  })
})
