import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlansPage from './page'
import { planService } from '@/services/planService'
import { termService } from '@/services/termService'
import type { Plan } from '@/types/tenant'
import type { Term } from '@/types/term'

// spec: gestao-de-acesso-f2-portal-admin RF-18, blueprint §5.

vi.mock('@/services/planService', () => ({ planService: { listPlans: vi.fn(), createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn() } }))
vi.mock('@/services/termService', () => ({ termService: { list: vi.fn() } }))

const base = { descricao: '', activation_fee: 100, monthly_value: 99, included_services: ['crm'], is_active: true, cycle: 'mensal', term_id: 'term-1', product: 'plataforma', pages_included: 0, destaques: [], selo: '' }
const comLimite = { ...base, slug: 'captacao', nome: 'Captação', max_usuarios: 5 } as unknown as Plan
const semLimite = { ...base, slug: 'pagina', nome: 'Página' } as unknown as Plan

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><PlansPage /></QueryClientProvider>)
}

describe('Planos — máximo de usuários', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(planService.listPlans).mockResolvedValue({ active: [comLimite, semLimite], inactive: [] })
    vi.mocked(termService.list).mockResolvedValue([{ id: 'term-1', name: 'Termo', is_active: true } as unknown as Term])
    vi.mocked(planService.updatePlan).mockResolvedValue(comLimite)
    vi.mocked(planService.createPlan).mockResolvedValue(comLimite)
  })

  test('o cartão mostra o limite ou "sem limite"', async () => {
    renderizar()
    const cartao = (await screen.findByRole('heading', { name: 'Captação' })).closest('div') as HTMLElement
    expect(within(cartao.parentElement as HTMLElement).getByText(/Usuários: 5/)).toBeInTheDocument()
    const outro = screen.getByRole('heading', { name: 'Página' }).closest('div') as HTMLElement
    expect(within(outro.parentElement as HTMLElement).getByText(/Usuários: sem limite/)).toBeInTheDocument()
  })

  test('editar mostra o campo com ajuda e envia número', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Captação' }))
    const campo = await screen.findByLabelText('Máximo de usuários')
    expect(campo).toHaveValue(5)
    expect(screen.getByText('0 = sem limite. Mudar não remove ninguém; só impede convites novos acima do limite.')).toBeInTheDocument()
    fireEvent.change(campo, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toMatchObject({ max_usuarios: 8 })
  })

  test('plano sem limite abre com 0 e manda 0', async () => {
    renderizar()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Página' }))
    expect(await screen.findByLabelText('Máximo de usuários')).toHaveValue(0)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Plano' }))
    await waitFor(() => expect(planService.updatePlan).toHaveBeenCalled())
    expect(vi.mocked(planService.updatePlan).mock.calls[0][1]).toMatchObject({ max_usuarios: 0 })
  })
})
