import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { TenantUsersSection } from './TenantUsersSection'
import { tenantService } from '@/services/tenantService'
import { acessoService } from '@/services/acessoService'
import { useAuthStore } from '@/store/useAuthStore'
import { ApiError } from '@/lib/apiError'
import type { TenantUser } from '@/types/tenant'
import { catalogo, leitor } from './acessos/fixtures'

// spec: gestao-de-acesso-f2-portal-admin RF-17, RF-20, blueprint §4. Os
// usuários seguem o contrato de GET /admin/tenants/{id}/users (§8.2/§8.4).

vi.mock('@/services/tenantService', () => ({
  tenantService: { listUsers: vi.fn(), addUser: vi.fn(), removeUser: vi.fn(), blockUser: vi.fn(), updateUserName: vi.fn(), resetUserPassword: vi.fn(), updateUserAcessos: vi.fn() },
}))
vi.mock('@/services/acessoService', () => ({ acessoService: { catalogo: vi.fn(), listarPapeis: vi.fn() } }))
vi.mock('@/store/useAuthStore', () => ({ useAuthStore: vi.fn() }))

const ana: TenantUser = {
  email: 'ana@loja.com', name: 'Ana Souza', created_at: '2026-06-12T12:00:00Z', status: 'ativo',
  acessos: { portal: { papel: 'administrador', implicito: false }, crm: { papel: 'gestor', implicito: true }, blog: { papel: 'editor', implicito: true }, lp: { papel: 'administrador', implicito: true } },
}
const bia: TenantUser = {
  email: 'bia@loja.com', name: 'Bia Lima', created_at: '2026-06-12T12:00:00Z', status: 'bloqueado',
  acessos: { portal: { papel: 'membro', implicito: false }, crm: { papel: 'vendedor', implicito: false }, blog: { papel: 'redator', implicito: false }, lp: { papel: 'editor', implicito: false } },
}
const eu: TenantUser = { ...bia, email: 'op@unum.com', name: 'Operador', status: 'ativo' }

function renderizar(props: Partial<React.ComponentProps<typeof TenantUsersSection>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><TenantUsersSection tenantId="t1" servicosContratados={['crm']} {...props} /></QueryClientProvider>)
}

async function linhaDe(nome: string) {
  return (await screen.findByText(nome)).closest('tr') as HTMLElement
}

describe('TenantUsersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({ user: { email: 'op@unum.com', groups: ['GlobalAdmin'] } } as unknown as ReturnType<typeof useAuthStore>)
    vi.mocked(tenantService.listUsers).mockResolvedValue([ana, bia, eu])
    vi.mocked(acessoService.catalogo).mockResolvedValue(catalogo)
    vi.mocked(acessoService.listarPapeis).mockResolvedValue([leitor])
  })

  test('colunas: Portal e só as ferramentas contratadas', async () => {
    renderizar()
    await linhaDe('Ana Souza')
    const cabecalhos = screen.getAllByRole('columnheader').map((c) => c.textContent)
    expect(cabecalhos).toContain('Portal do Cliente')
    expect(cabecalhos).toContain('CRM')
    expect(cabecalhos).not.toContain('Blog')
    expect(cabecalhos).not.toContain('Páginas')
  })

  test('papel por ferramenta, implícito marcado, status', async () => {
    renderizar()
    const linha = await linhaDe('Ana Souza')
    expect(within(linha).getByText('Administrador')).toBeInTheDocument()
    expect(within(linha).getByText('Gestor')).toBeInTheDocument()
    expect(within(linha).getByTitle('Não gravado: vale o papel mais alto, porque é Administrador do Portal')).toBeInTheDocument()
    expect(within(linha).getByText('Ativo')).toBeInTheDocument()
    expect(within(await linhaDe('Bia Lima')).getByText('Bloqueado')).toBeInTheDocument()
  })

  test('contador do limite, e aviso acima do limite', async () => {
    renderizar({ maxUsuarios: 5 })
    expect(await screen.findByText('3 de 5 usuários')).toBeInTheDocument()
    vi.mocked(tenantService.listUsers).mockResolvedValue([ana, bia, eu])
  })

  test('acima do limite avisa', async () => {
    renderizar({ maxUsuarios: 2 })
    expect(await screen.findByText(/3 de 2 usuários/)).toBeInTheDocument()
    expect(screen.getByText(/acima do limite do plano/)).toBeInTheDocument()
  })

  test('lista vazia', async () => {
    vi.mocked(tenantService.listUsers).mockResolvedValue([])
    renderizar()
    expect(await screen.findByText(/nenhum usuário/i)).toBeInTheDocument()
  })

  test('editar acesso: manda só o que mudou', async () => {
    vi.mocked(tenantService.updateUserAcessos).mockResolvedValue({ message: 'ok' })
    renderizar()
    fireEvent.click(within(await linhaDe('Ana Souza')).getByRole('button', { name: 'Editar acesso de Ana Souza' }))
    expect(await screen.findByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument()
    expect(screen.getByLabelText('Portal do Cliente')).toHaveValue('administrador')
    expect(screen.getByLabelText('CRM')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('CRM'), { target: { value: 'vendedor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(tenantService.updateUserAcessos).toHaveBeenCalledWith('t1', 'ana@loja.com', { crm: 'vendedor' }))
    expect(tenantService.updateUserName).not.toHaveBeenCalled()
    expect(tenantService.blockUser).not.toHaveBeenCalled()
  })

  test('editar nome e bloqueio usam as rotas de hoje', async () => {
    vi.mocked(tenantService.updateUserName).mockResolvedValue({ message: 'ok' })
    vi.mocked(tenantService.blockUser).mockResolvedValue({ message: 'ok' })
    renderizar()
    fireEvent.click(within(await linhaDe('Ana Souza')).getByRole('button', { name: 'Editar acesso de Ana Souza' }))
    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Ana S.' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bloquear acesso a esta empresa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(tenantService.updateUserName).toHaveBeenCalledWith('t1', 'ana@loja.com', 'Ana S.'))
    await waitFor(() => expect(tenantService.blockUser).toHaveBeenCalledWith('t1', 'ana@loja.com', true))
    expect(tenantService.updateUserAcessos).not.toHaveBeenCalled()
  })

  test('último administrador: a mensagem aparece na gaveta', async () => {
    vi.mocked(tenantService.updateUserAcessos).mockRejectedValue(new ApiError('ultimo_administrador', 409, { error: 'ultimo_administrador' }))
    renderizar()
    fireEvent.click(within(await linhaDe('Ana Souza')).getByRole('button', { name: 'Editar acesso de Ana Souza' }))
    fireEvent.change(await screen.findByLabelText('Portal do Cliente'), { target: { value: 'membro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A empresa precisa de pelo menos um Administrador do Portal ativo.')
  })

  test('própria conta: tudo travado, com a explicação', async () => {
    renderizar()
    fireEvent.click(within(await linhaDe('Operador')).getByRole('button', { name: 'Editar acesso de Operador' }))
    expect(await screen.findByText('Você não pode alterar seu próprio perfil.')).toBeInTheDocument()
    expect(screen.getByLabelText('Portal do Cliente')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  test('convidar: acessos por ferramenta, sem as entradas automáticas', async () => {
    vi.mocked(tenantService.addUser).mockResolvedValue({ message: 'ok' })
    renderizar()
    // Convidar só habilita depois que catálogo e papéis carregam.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Convidar' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Convidar' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Caio' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'caio@loja.com' } })
    fireEvent.change(screen.getByLabelText('CRM'), { target: { value: 'vendedor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Convidar pessoa' }))
    await waitFor(() => expect(tenantService.addUser).toHaveBeenCalledWith('t1', { name: 'Caio', email: 'caio@loja.com', acessos: { portal: 'membro', crm: 'vendedor' } }))
  })

  test('convidar sem nome e e-mail mostra os erros', async () => {
    renderizar()
    // Convidar só habilita depois que catálogo e papéis carregam.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Convidar' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Convidar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Convidar pessoa' }))
    expect(await screen.findByText(/nome é obrigatório/i)).toBeInTheDocument()
    expect(screen.getByText(/e-mail é obrigatório/i)).toBeInTheDocument()
    expect(tenantService.addUser).not.toHaveBeenCalled()
  })

  test('convidar acima do limite pede confirmação no próprio botão', async () => {
    renderizar({ maxUsuarios: 3 })
    // Convidar só habilita depois que catálogo e papéis carregam.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Convidar' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Convidar' }))
    expect(screen.getByText('O plano permite 3 usuários; esta será a 4ª pessoa. Convidar assim mesmo?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convidar acima do limite' })).toBeInTheDocument()
  })

  test('redefinir senha confirma na gaveta e avisa', async () => {
    vi.mocked(tenantService.resetUserPassword).mockResolvedValue({ message: 'ok' })
    renderizar()
    fireEvent.click(within(await linhaDe('Ana Souza')).getByRole('button', { name: 'Editar acesso de Ana Souza' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Redefinir senha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar senha temporária' }))
    await waitFor(() => expect(tenantService.resetUserPassword).toHaveBeenCalledWith('t1', 'ana@loja.com'))
    expect(await screen.findByRole('status')).toHaveTextContent('Senha temporária enviada.')
  })

  test('remover confirma num diálogo; a própria conta não remove', async () => {
    vi.mocked(tenantService.removeUser).mockResolvedValue({ message: 'ok' })
    renderizar()
    expect(within(await linhaDe('Operador')).getByRole('button', { name: 'Remover Operador' })).toBeDisabled()
    fireEvent.click(within(await linhaDe('Bia Lima')).getByRole('button', { name: 'Remover Bia Lima' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(tenantService.removeUser).toHaveBeenCalledWith('t1', 'bia@loja.com'))
  })

  test('falha ao carregar aparece', async () => {
    vi.mocked(tenantService.listUsers).mockRejectedValue(new Error('x'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os usuários.')
  })
})

describe('TenantUsersSection — lacunas do Verifier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({ user: { email: 'op@unum.com', groups: ['GlobalAdmin'] } } as unknown as ReturnType<typeof useAuthStore>)
    vi.mocked(tenantService.listUsers).mockResolvedValue([ana, bia, eu])
    vi.mocked(acessoService.listarPapeis).mockResolvedValue([leitor])
  })

  test('G4: sem catálogo, a tela diz e não abre gaveta vazia', async () => {
    vi.mocked(acessoService.catalogo).mockRejectedValue(new Error('x'))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os papéis. Os acessos não podem ser editados agora.')
    expect(screen.getByRole('button', { name: 'Convidar' })).toBeDisabled()
    expect(within(await linhaDe('Ana Souza')).getByRole('button', { name: 'Editar acesso de Ana Souza' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  test('asterisco explica o implícito certo; lixeira desabilitada diz por quê', async () => {
    vi.mocked(acessoService.catalogo).mockResolvedValue(catalogo)
    const caio: TenantUser = { ...bia, email: 'caio@loja.com', name: 'Caio', status: 'ativo',
      acessos: { ...bia.acessos, crm: { papel: 'sem_acesso', implicito: true } } }
    vi.mocked(tenantService.listUsers).mockResolvedValue([ana, caio, eu])
    renderizar()
    expect(within(await linhaDe('Caio')).getByTitle('Não gravado: sem acesso, porque não é Administrador do Portal')).toBeInTheDocument()
    expect(within(await linhaDe('Operador')).getByRole('button', { name: 'Remover Operador' })).toHaveAttribute('title', 'Você não pode remover a própria conta.')
  })

  test('Membro implícito do Portal explica que todo mundo é pelo menos Membro', async () => {
    vi.mocked(acessoService.catalogo).mockResolvedValue(catalogo)
    const dani: TenantUser = { ...bia, email: 'dani@loja.com', name: 'Dani', status: 'ativo',
      acessos: { ...bia.acessos, portal: { papel: 'membro', implicito: true } } }
    vi.mocked(tenantService.listUsers).mockResolvedValue([ana, dani, eu])
    renderizar()
    expect(within(await linhaDe('Dani')).getByTitle('Não gravado: toda pessoa da empresa é pelo menos Membro do Portal')).toBeInTheDocument()
  })
})
