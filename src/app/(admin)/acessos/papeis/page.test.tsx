import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PapeisPage from './page'
import { acessoService } from '@/services/acessoService'
import { useRouter, useSearchParams } from 'next/navigation'
import { catalogo, leitor } from '@/components/acessos/fixtures'

// spec: gestao-de-acesso-f2-portal-admin RF-16, blueprint §3.

vi.mock('@/services/acessoService', () => ({
  acessoService: { catalogo: vi.fn(), listarPapeis: vi.fn(), criarPapel: vi.fn(), atualizarPapel: vi.fn(), excluirPapel: vi.fn(), usoDoPapel: vi.fn(), historico: vi.fn() },
}))
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), useSearchParams: vi.fn(), usePathname: vi.fn(() => '/acessos/papeis') }))

const replace = vi.fn()

function renderizar(ferramenta?: string) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(ferramenta ? `ferramenta=${ferramenta}` : '') as unknown as ReturnType<typeof useSearchParams>)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><PapeisPage /></QueryClientProvider>)
}

describe('Página Papéis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ replace, push: vi.fn() } as unknown as ReturnType<typeof useRouter>)
    vi.mocked(acessoService.catalogo).mockResolvedValue(catalogo)
    vi.mocked(acessoService.listarPapeis).mockResolvedValue([leitor])
    vi.mocked(acessoService.usoDoPapel).mockResolvedValue({ em_uso: 0, empresas: [] })
  })

  test('título, abas na ordem do catálogo e Histórico', async () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Papéis' })).toBeInTheDocument()
    const abas = await screen.findAllByRole('tab')
    expect(abas.map((a) => a.textContent)).toEqual(['Portal do Cliente', 'CRM', 'Blog', 'Páginas', 'Histórico'])
    expect(abas[0]).toHaveAttribute('aria-selected', 'true')
  })

  test('aba da URL: papéis padrão só leitura e o personalizado com ações', async () => {
    renderizar('crm')
    const painel = await screen.findByRole('tabpanel')
    const linhaGestor = within(painel).getByRole('row', { name: /Gestor/ })
    expect(within(linhaGestor).getByText('Padrão')).toBeInTheDocument()
    expect(within(linhaGestor).queryByRole('button')).not.toBeInTheDocument()
    const linhaLeitor = within(painel).getByRole('row', { name: /Leitor/ })
    expect(within(linhaLeitor).getByText('Personalizado')).toBeInTheDocument()
    expect(within(linhaLeitor).getByText('Ver e buscar leads')).toBeInTheDocument()
    expect(within(linhaLeitor).getByRole('button', { name: 'Editar papel Leitor' })).toBeInTheDocument()
    expect(within(linhaLeitor).getByRole('button', { name: 'Excluir papel Leitor' })).toBeInTheDocument()
  })

  test('trocar de aba atualiza a URL', async () => {
    renderizar('crm')
    fireEvent.click(await screen.findByRole('tab', { name: 'Blog' }))
    expect(replace).toHaveBeenCalledWith('/acessos/papeis?ferramenta=blog')
  })

  test('ferramenta sem personalizado mostra o convite a criar', async () => {
    renderizar('blog')
    expect(await screen.findByText('Nenhum papel personalizado no Blog. Crie um quando os padrões não servirem.')).toBeInTheDocument()
  })

  test('Novo papel abre a gaveta da ferramenta da aba; salvar avisa "Papel salvo"', async () => {
    vi.mocked(acessoService.criarPapel).mockResolvedValue({ ...leitor, id: 'p-novo', nome: 'Supervisor' })
    renderizar('crm')
    await screen.findByRole('tabpanel')
    fireEvent.click(screen.getByRole('button', { name: 'Novo papel' }))
    expect(await screen.findByRole('heading', { name: 'Novo papel — CRM' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Supervisor' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Ver e buscar leads/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar papel' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Papel salvo')
  })

  test('editar e excluir abrem a gaveta e o diálogo do papel', async () => {
    renderizar('crm')
    fireEvent.click(await screen.findByRole('button', { name: 'Editar papel Leitor' }))
    expect(await screen.findByRole('heading', { name: 'Editar papel — CRM' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir papel Leitor' }))
    expect(await screen.findByRole('alertdialog', { name: 'Excluir o papel Leitor?' })).toBeInTheDocument()
  })

  test('aba Histórico mostra as mudanças de papéis (PLATFORM)', async () => {
    vi.mocked(acessoService.historico).mockResolvedValue({ registros: [], cursor: '' })
    renderizar('historico')
    await waitFor(() => expect(acessoService.historico).toHaveBeenCalledWith('PLATFORM', undefined))
  })

  test('falha ao carregar mostra o erro e tenta de novo', async () => {
    vi.mocked(acessoService.catalogo).mockRejectedValueOnce(new Error('x')).mockResolvedValue(catalogo)
    renderizar('crm')
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os papéis.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('tabpanel')).toBeInTheDocument()
  })
})
