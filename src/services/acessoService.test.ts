import { beforeEach, describe, expect, it, vi } from 'vitest'
import { acessoService } from './acessoService'
import { tenantService } from './tenantService'
import { useAuthStore } from '@/store/useAuthStore'
import { ApiError } from '@/lib/apiError'
import type { Catalogo, PapelPersonalizado, PaginaHistorico, UsoDoPapel } from '@/types/acesso'

// spec: gestao-de-acesso-f2-portal-admin RF-15 — contrato de TECH-DESIGN §8.3 e §8.4.

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
vi.mock('amazon-cognito-identity-js', () => ({ CognitoUser: vi.fn(), CognitoUserPool: vi.fn(), CognitoRefreshToken: vi.fn() }))

function resposta(status: number, corpo?: unknown) {
  return { ok: status < 300, status, json: async () => corpo, text: async () => (corpo === undefined ? '' : JSON.stringify(corpo)) }
}

function ultimaChamada() {
  const [url, opcoes] = mockFetch.mock.calls.at(-1)!
  return { url: String(url), metodo: opcoes?.method ?? 'GET', corpo: opcoes?.body ? JSON.parse(opcoes.body) : undefined }
}

describe('acessoService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    useAuthStore.setState({ user: { email: 'op@unum.com', groups: ['GlobalAdmin'] }, token: 't', refreshToken: 'r', isAuthenticated: true, isAdmin: true, hasHydrated: true })
  })

  it('catálogo, papéis e uso usam as rotas do operador', async () => {
    const catalogo: Catalogo = { ferramentas: [{ id: 'crm', nome: 'CRM', servico: 'crm', papel_mais_alto: 'gestor', permissoes: [{ id: 'crm.lead.ver', nome: 'Ver', descricao: '', requer: [] }], papeis_sistema: [{ id: 'gestor', nome: 'Gestor', permissoes: ['crm.lead.ver'] }] }] }
    mockFetch.mockResolvedValueOnce(resposta(200, catalogo))
    expect(await acessoService.catalogo()).toEqual(catalogo)
    expect(ultimaChamada().url).toMatch(/\/admin\/acessos\/catalogo$/)

    const papel: PapelPersonalizado = { ferramenta: 'crm', id: 'p-1', nome: 'Leitor', descricao: '', permissoes: ['crm.lead.ver'], criado_por: 'op', criado_em: 'x', atualizado_por: 'op', atualizado_em: 'x' }
    mockFetch.mockResolvedValueOnce(resposta(200, { papeis: [papel] }))
    expect(await acessoService.listarPapeis()).toEqual([papel])
    expect(ultimaChamada().url).toMatch(/\/admin\/papeis$/)

    const uso: UsoDoPapel = { em_uso: 3, empresas: [{ tenant_id: 'TENANT#DEMO_REVIEW', nome_negocio: 'Demo', usuarios: 3 }] }
    mockFetch.mockResolvedValueOnce(resposta(200, uso))
    expect(await acessoService.usoDoPapel('crm', 'p-1')).toEqual(uso)
    expect(ultimaChamada().url).toMatch(/\/admin\/papeis\/crm\/p-1\/uso$/)
  })

  it('criar, atualizar e excluir mandam o corpo do contrato', async () => {
    mockFetch.mockResolvedValueOnce(resposta(201, { papel: { id: 'p-9' } }))
    await acessoService.criarPapel({ ferramenta: 'blog', nome: 'Revisor', descricao: '', permissoes: ['blog.post.ver'] })
    expect(ultimaChamada()).toMatchObject({ metodo: 'POST', corpo: { ferramenta: 'blog', nome: 'Revisor', descricao: '', permissoes: ['blog.post.ver'] } })

    mockFetch.mockResolvedValueOnce(resposta(200, { papel: { id: 'p-9' } }))
    await acessoService.atualizarPapel('blog', 'p-9', { nome: 'Revisor 2', descricao: 'd', permissoes: ['blog.post.ver'] })
    const put = ultimaChamada()
    expect(put.url).toMatch(/\/admin\/papeis\/blog\/p-9$/)
    expect(put).toMatchObject({ metodo: 'PUT', corpo: { nome: 'Revisor 2', descricao: 'd', permissoes: ['blog.post.ver'] } })

    mockFetch.mockResolvedValueOnce(resposta(204))
    await acessoService.excluirPapel('blog', 'p-9')
    expect(ultimaChamada()).toMatchObject({ metodo: 'DELETE' })
  })

  it('o erro guarda o corpo inteiro: faltando e em_uso', async () => {
    mockFetch.mockResolvedValueOnce(resposta(400, { error: 'permissao_requer', faltando: ['blog.post.ver'] }))
    const erro = await acessoService.criarPapel({ ferramenta: 'blog', nome: 'X', descricao: '', permissoes: ['blog.post.publicar'] }).catch((e) => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect(erro.status).toBe(400)
    expect(erro.message).toBe('permissao_requer')
    expect(erro.detalhes).toEqual({ error: 'permissao_requer', faltando: ['blog.post.ver'] })

    mockFetch.mockResolvedValueOnce(resposta(409, { error: 'papel_em_uso', em_uso: 4 }))
    const emUso = await acessoService.excluirPapel('crm', 'p-1').catch((e) => e)
    expect(emUso.detalhes.em_uso).toBe(4)
  })

  it('histórico codifica o tenant e repassa o cursor', async () => {
    const pagina: PaginaHistorico = { registros: [{ criado_em: '2026-10-17T10:00:00Z', ator: 'op', acao: 'MEMBER_INVITED', alvo: 'a@x.com', antes: null, depois: { role: 'user' } }], cursor: 'c2' }
    mockFetch.mockResolvedValueOnce(resposta(200, pagina))
    expect(await acessoService.historico('TENANT#DEMO_REVIEW', 'c1')).toEqual(pagina)
    expect(ultimaChamada().url).toMatch(/\/admin\/acessos\/historico\?tenant_id=TENANT%23DEMO_REVIEW&cursor=c1$/)
    mockFetch.mockResolvedValueOnce(resposta(200, { registros: [], cursor: '' }))
    await acessoService.historico('PLATFORM')
    expect(ultimaChamada().url).toMatch(/\/admin\/acessos\/historico\?tenant_id=PLATFORM$/)
  })
})

describe('tenantService — acessos do usuário', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    useAuthStore.setState({ user: { email: 'op@unum.com', groups: ['GlobalAdmin'] }, token: 't', refreshToken: 'r', isAuthenticated: true, isAdmin: true, hasHydrated: true })
  })

  it('updateUserAcessos: PATCH com o e-mail codificado e { acessos }', async () => {
    mockFetch.mockResolvedValueOnce(resposta(200, { message: 'Access updated' }))
    await tenantService.updateUserAcessos('t1', 'ana@x.com', { crm: 'gestor', blog: '' })
    const c = ultimaChamada()
    expect(c.url).toMatch(/\/admin\/tenants\/t1\/users\/ana%40x\.com\/acessos$/)
    expect(c).toMatchObject({ metodo: 'PATCH', corpo: { acessos: { crm: 'gestor', blog: '' } } })
  })

  it('updateUserAcessos: 409 traz o código para a tela', async () => {
    mockFetch.mockResolvedValueOnce(resposta(409, { error: 'ultimo_administrador' }))
    const erro = await tenantService.updateUserAcessos('t1', 'a@x.com', { portal: 'membro' }).catch((e) => e)
    expect(erro).toBeInstanceOf(ApiError)
    expect(erro.message).toBe('ultimo_administrador')
    expect(erro.detalhes).toEqual({ error: 'ultimo_administrador' })
  })
})
