import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { HistoricoDeAcesso } from './HistoricoDeAcesso'
import { acessoService } from '@/services/acessoService'
import type { PaginaHistorico } from '@/types/acesso'
import { catalogo, leitor } from './fixtures'

// spec: gestao-de-acesso-f2-portal-admin RF-19, blueprint §6. Os registros
// seguem o que a API grava: MEMBER_ACCESS_CHANGED com {acessos, role}; ROLE_*
// com o domain.Papel serializado (campos Nome, Ferramenta).

vi.mock('@/services/acessoService', () => ({ acessoService: { historico: vi.fn() } }))

function renderizar(tenantId = 't1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><HistoricoDeAcesso tenantId={tenantId} catalogo={catalogo} /></QueryClientProvider>)
}

const pagina1: PaginaHistorico = {
  registros: [
    { criado_em: '2026-10-16T17:32:00Z', ator: 'op@unumpeople.com', acao: 'MEMBER_ACCESS_CHANGED', alvo: 'ana@loja.com',
      antes: { acessos: { portal: 'membro', crm: 'vendedor' }, role: 'user' }, depois: { acessos: { portal: 'membro', crm: 'gestor' }, role: 'user' } },
    { criado_em: '2026-10-16T14:05:00Z', ator: 'op@unumpeople.com', acao: 'MEMBER_INVITED', alvo: 'bia@loja.com', antes: null, depois: { role: 'user', acessos: { portal: 'membro' } } },
    { criado_em: '2026-10-15T12:10:00Z', ator: 'op@unumpeople.com', acao: 'ROLE_CREATED', alvo: 'crm#p-1', antes: null, depois: { nome: 'Leitor de leads', ferramenta: 'crm' } },
  ],
  cursor: 'c2',
}

describe('HistoricoDeAcesso', () => {
  beforeEach(() => vi.clearAllMocks())

  test('frases, autor e diferença por ferramenta com os nomes do catálogo', async () => {
    vi.mocked(acessoService.historico).mockResolvedValueOnce(pagina1)
    renderizar()
    expect(await screen.findByText('mudou o acesso de ana@loja.com')).toBeInTheDocument()
    expect(screen.getByText('CRM: Vendedor → Gestor')).toBeInTheDocument()
    expect(screen.getByText('convidou bia@loja.com')).toBeInTheDocument()
    expect(screen.getByText('criou o papel Leitor de leads')).toBeInTheDocument()
    expect(screen.getAllByText('op@unumpeople.com')).toHaveLength(3)
    expect(acessoService.historico).toHaveBeenCalledWith('t1', undefined)
  })

  test('carregar mais usa o cursor e some quando acaba', async () => {
    vi.mocked(acessoService.historico)
      .mockResolvedValueOnce(pagina1)
      .mockResolvedValueOnce({ registros: [{ criado_em: '2026-10-14T10:00:00Z', ator: 'op', acao: 'MEMBER_REMOVED', alvo: 'caio@loja.com', antes: { role: 'user' }, depois: null }], cursor: '' })
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais' }))
    expect(await screen.findByText('removeu caio@loja.com')).toBeInTheDocument()
    expect(acessoService.historico).toHaveBeenLastCalledWith('t1', 'c2')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument())
  })

  test('vazio e erro', async () => {
    vi.mocked(acessoService.historico).mockResolvedValueOnce({ registros: [], cursor: '' })
    renderizar()
    expect(await screen.findByText('Nenhuma mudança de acesso registrada.')).toBeInTheDocument()
  })

  test('erro mostra a mensagem e tenta de novo', async () => {
    vi.mocked(acessoService.historico).mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce({ registros: [], cursor: '' })
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Nenhuma mudança de acesso registrada.')).toBeInTheDocument()
  })
})

// Conferência visual (2026-10-18): o papel personalizado aparecia pelo id.
test('papel personalizado aparece pelo nome', async () => {
  vi.mocked(acessoService.historico).mockResolvedValueOnce({ registros: [
    { criado_em: '2026-10-16T17:32:00Z', ator: 'op', acao: 'MEMBER_ACCESS_CHANGED', alvo: 'caio@loja.com',
      antes: { acessos: { portal: 'membro', crm: 'vendedor' } }, depois: { acessos: { portal: 'membro', crm: 'p-aaaaaaaaaaaa' } } },
  ], cursor: '' })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><HistoricoDeAcesso tenantId="t1" catalogo={catalogo} papeis={[leitor]} /></QueryClientProvider>)
  expect(await screen.findByText('CRM: Vendedor → Leitor')).toBeInTheDocument()
})
