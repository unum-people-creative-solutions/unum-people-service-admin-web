// O tipo genérico de apiFetch é o contrato; a resposta não é reinterpretada.

import { apiFetch } from '@/lib/api';
import type {
  Catalogo,
  FerramentaId,
  PaginaHistorico,
  PapelEdicao,
  PapelInput,
  PapelPersonalizado,
  UsoDoPapel,
} from '@/types/acesso';

const enc = encodeURIComponent;

export const acessoService = {
  catalogo: (): Promise<Catalogo> => apiFetch<Catalogo>('/admin/acessos/catalogo'),

  listarPapeis: async (): Promise<PapelPersonalizado[]> =>
    (await apiFetch<{ papeis: PapelPersonalizado[] }>('/admin/papeis')).papeis,

  criarPapel: async (input: PapelInput): Promise<PapelPersonalizado> =>
    (
      await apiFetch<{ papel: PapelPersonalizado }>('/admin/papeis', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).papel,

  atualizarPapel: async (
    ferramenta: FerramentaId,
    id: string,
    input: PapelEdicao,
  ): Promise<PapelPersonalizado> =>
    (
      await apiFetch<{ papel: PapelPersonalizado }>(
        `/admin/papeis/${enc(ferramenta)}/${enc(id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        },
      )
    ).papel,

  excluirPapel: (ferramenta: FerramentaId, id: string): Promise<null> =>
    apiFetch<null>(`/admin/papeis/${enc(ferramenta)}/${enc(id)}`, { method: 'DELETE' }),

  usoDoPapel: (ferramenta: FerramentaId, id: string): Promise<UsoDoPapel> =>
    apiFetch<UsoDoPapel>(`/admin/papeis/${enc(ferramenta)}/${enc(id)}/uso`),

  historico: (tenantId: string, cursor?: string): Promise<PaginaHistorico> => {
    const params = `tenant_id=${enc(tenantId)}`;
    const query = cursor ? `${params}&cursor=${enc(cursor)}` : params;
    return apiFetch<PaginaHistorico>(`/admin/acessos/historico?${query}`);
  },
};
