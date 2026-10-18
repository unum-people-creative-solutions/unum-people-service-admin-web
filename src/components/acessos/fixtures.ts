import type { Catalogo, PapelPersonalizado } from '@/types/acesso'

// Catálogo no formato de GET /admin/acessos/catalogo (TECH-DESIGN §8.3), com
// as permissões reais do CRM e do Blog: os testes usam o contrato, não um mock solto.
export const catalogo: Catalogo = {
  ferramentas: [
    {
      id: 'portal', nome: 'Portal do Cliente', servico: '', papel_mais_alto: 'administrador',
      permissoes: [
        { id: 'portal.empresa.ver', nome: 'Ver a empresa, os produtos e o contrato', descricao: '', requer: [] },
        { id: 'portal.usuarios.gerir', nome: 'Gerir usuários da empresa', descricao: '', requer: ['portal.empresa.ver'] },
      ],
      papeis_sistema: [
        { id: 'administrador', nome: 'Administrador', permissoes: ['portal.empresa.ver', 'portal.usuarios.gerir'] },
        { id: 'membro', nome: 'Membro', permissoes: ['portal.empresa.ver'] },
      ],
    },
    {
      id: 'crm', nome: 'CRM', servico: 'crm', papel_mais_alto: 'gestor',
      permissoes: [
        { id: 'crm.lead.ver', nome: 'Ver e buscar leads', descricao: '', requer: [] },
        { id: 'crm.lead.criar', nome: 'Criar lead', descricao: '', requer: ['crm.lead.ver'] },
        { id: 'crm.lead.excluir', nome: 'Excluir lead', descricao: '', requer: ['crm.lead.ver'] },
      ],
      papeis_sistema: [
        { id: 'gestor', nome: 'Gestor', permissoes: ['crm.lead.ver', 'crm.lead.criar', 'crm.lead.excluir'] },
        { id: 'vendedor', nome: 'Vendedor', permissoes: ['crm.lead.ver', 'crm.lead.criar'] },
        { id: 'sem_acesso', nome: 'Sem acesso', permissoes: [] },
      ],
    },
    {
      id: 'blog', nome: 'Blog', servico: 'blog', papel_mais_alto: 'editor',
      permissoes: [
        { id: 'blog.post.ver', nome: 'Ver posts', descricao: '', requer: [] },
        { id: 'blog.post.editar_proprio', nome: 'Editar os próprios posts', descricao: '', requer: ['blog.post.ver'] },
        { id: 'blog.post.editar_qualquer', nome: 'Editar posts de qualquer autor', descricao: '', requer: ['blog.post.editar_proprio'] },
      ],
      papeis_sistema: [
        { id: 'editor', nome: 'Editor', permissoes: ['blog.post.ver', 'blog.post.editar_proprio', 'blog.post.editar_qualquer'] },
        { id: 'redator', nome: 'Redator', permissoes: ['blog.post.ver', 'blog.post.editar_proprio'] },
        { id: 'sem_acesso', nome: 'Sem acesso', permissoes: [] },
      ],
    },
    {
      id: 'lp', nome: 'Páginas', servico: 'site', papel_mais_alto: 'administrador',
      permissoes: [{ id: 'lp.pagina.ver', nome: 'Ver as páginas', descricao: '', requer: [] }],
      papeis_sistema: [
        { id: 'administrador', nome: 'Administrador', permissoes: ['lp.pagina.ver'] },
        { id: 'sem_acesso', nome: 'Sem acesso', permissoes: [] },
      ],
    },
  ],
}

export const crm = catalogo.ferramentas[1]
export const blog = catalogo.ferramentas[2]

export const leitor: PapelPersonalizado = {
  ferramenta: 'crm', id: 'p-aaaaaaaaaaaa', nome: 'Leitor', descricao: 'Só lê', permissoes: ['crm.lead.ver'],
  criado_por: 'op@unum.com', criado_em: '2026-10-17T10:00:00Z', atualizado_por: 'op@unum.com', atualizado_em: '2026-10-17T10:00:00Z',
}
