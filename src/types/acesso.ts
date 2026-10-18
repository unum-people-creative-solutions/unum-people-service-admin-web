// Contrato de /admin/acessos e /admin/papeis (TECH-DESIGN-gestao-de-acesso §8.3 e §8.4).

export type FerramentaId = 'portal' | 'crm' | 'blog' | 'lp';

export interface PermissaoCatalogo {
  id: string;
  nome: string;
  descricao: string;
  requer: string[];
}

export interface PapelSistema {
  id: string;
  nome: string;
  permissoes: string[];
}

export interface FerramentaCatalogo {
  id: FerramentaId;
  nome: string;
  servico: string;
  papel_mais_alto: string;
  permissoes: PermissaoCatalogo[];
  papeis_sistema: PapelSistema[];
}

export interface Catalogo {
  ferramentas: FerramentaCatalogo[];
}

export interface PapelPersonalizado {
  ferramenta: FerramentaId;
  id: string;
  nome: string;
  descricao: string;
  permissoes: string[];
  criado_por: string;
  criado_em: string;
  atualizado_por: string;
  atualizado_em: string;
}

export interface PapelInput {
  ferramenta: FerramentaId;
  nome: string;
  descricao: string;
  permissoes: string[];
}

export type PapelEdicao = Omit<PapelInput, 'ferramenta'>;

export interface EmpresaUsandoPapel {
  tenant_id: string;
  nome_negocio: string;
  usuarios: number;
}

export interface UsoDoPapel {
  em_uso: number;
  empresas: EmpresaUsandoPapel[];
}

export interface RegistroHistorico {
  criado_em: string;
  ator: string;
  acao: string;
  alvo: string;
  antes: unknown;
  depois: unknown;
}

export interface PaginaHistorico {
  registros: RegistroHistorico[];
  cursor: string;
}

export interface AcessoDaFerramenta {
  papel: string;
  implicito: boolean;
}

export type AcessosDoUsuario = Record<FerramentaId, AcessoDaFerramenta>;

/** "" devolve a ferramenta ao papel implícito. */
export type MudancasDeAcesso = Partial<Record<FerramentaId, string>>;
