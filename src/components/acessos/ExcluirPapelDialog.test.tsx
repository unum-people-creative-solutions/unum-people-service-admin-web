import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ExcluirPapelDialog } from './ExcluirPapelDialog'
import { acessoService } from '@/services/acessoService'
import { ApiError } from '@/lib/apiError'
import { leitor } from './fixtures'

// spec: gestao-de-acesso-f2-portal-admin RF-16, blueprint §3.2 (D8).

vi.mock('@/services/acessoService', () => ({
  acessoService: { excluirPapel: vi.fn(), usoDoPapel: vi.fn() },
}))

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const aoFechar = vi.fn()
  const aoExcluido = vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <ExcluirPapelDialog aberto papel={leitor} aoFechar={aoFechar} aoExcluido={aoExcluido} />
    </QueryClientProvider>,
  )
  return { aoFechar, aoExcluido }
}

describe('ExcluirPapelDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  test('confirma e exclui', async () => {
    vi.mocked(acessoService.excluirPapel).mockResolvedValue(null)
    const { aoExcluido } = renderizar()
    expect(screen.getByRole('alertdialog', { name: 'Excluir o papel Leitor?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(acessoService.excluirPapel).toHaveBeenCalledWith('crm', 'p-aaaaaaaaaaaa'))
    await waitFor(() => expect(aoExcluido).toHaveBeenCalled())
  })

  test('em uso: explica, lista as empresas com link e tira o botão de excluir', async () => {
    vi.mocked(acessoService.excluirPapel).mockRejectedValue(new ApiError('papel_em_uso', 409, { error: 'papel_em_uso', em_uso: 4 }))
    vi.mocked(acessoService.usoDoPapel).mockResolvedValue({ em_uso: 4, empresas: [{ tenant_id: 'TENANT#DEMO_REVIEW', nome_negocio: 'Demo', usuarios: 4 }] })
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Em uso por 4 pessoas. Troque o papel delas antes de excluir.')).toBeInTheDocument()
    const link = await screen.findByRole('link', { name: /Demo/ })
    expect(link).toHaveAttribute('href', '/tenants/TENANT%23DEMO_REVIEW')
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
  })

  test('outro erro aparece na tela', async () => {
    vi.mocked(acessoService.excluirPapel).mockRejectedValue(new ApiError('internal_error', 500, {}))
    renderizar()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível excluir o papel')
  })
})
