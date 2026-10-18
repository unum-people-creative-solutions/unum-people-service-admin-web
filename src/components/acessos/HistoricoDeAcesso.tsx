'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { acessoService } from '@/services/acessoService';
import type { Catalogo, PapelPersonalizado, RegistroHistorico } from '@/types/acesso';

interface HistoricoDeAcessoProps {
  tenantId: string;
  catalogo?: Catalogo;
  papeis?: PapelPersonalizado[];
}

interface EstadoDeAcesso {
  acessos?: Record<string, string>;
  role?: string;
}

interface FerramentaComparavel {
  id: string;
  nome: string;
  papeis: readonly { id: string; nome: string }[];
}

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function mapaDeStrings(valor: unknown): Record<string, string> | undefined {
  if (!ehObjeto(valor)) return undefined;
  const mapa: Record<string, string> = {};
  for (const [chave, item] of Object.entries(valor)) {
    if (typeof item !== 'string') return undefined;
    mapa[chave] = item;
  }
  return mapa;
}

function lerEstado(valor: unknown): EstadoDeAcesso {
  if (!ehObjeto(valor)) return {};
  const acessos = mapaDeStrings(valor.acessos);
  const role = typeof valor.role === 'string' ? valor.role : undefined;
  return {
    ...(acessos ? { acessos } : {}),
    ...(role !== undefined ? { role } : {}),
  };
}

function nomeSerializado(valor: unknown): string {
  if (!ehObjeto(valor)) return '';
  return typeof valor.Nome === 'string' ? valor.Nome : '';
}

function fraseDoRegistro(registro: RegistroHistorico): string {
  switch (registro.acao) {
    case 'MEMBER_INVITED':
    case 'USER_INVITED':
      return `convidou ${registro.alvo}`;
    case 'MEMBER_LIMIT_OVERRIDDEN':
      return `convidou ${registro.alvo} acima do limite do plano`;
    case 'MEMBER_ACCESS_CHANGED':
      return `mudou o acesso de ${registro.alvo}`;
    case 'MEMBER_BLOCKED':
      return `bloqueou ${registro.alvo}`;
    case 'MEMBER_UNBLOCKED':
      return `desbloqueou ${registro.alvo}`;
    case 'MEMBER_REMOVED':
      return `removeu ${registro.alvo}`;
    case 'ROLE_CREATED':
      return `criou o papel ${nomeSerializado(registro.depois)}`;
    case 'ROLE_UPDATED':
      return `editou o papel ${nomeSerializado(registro.depois)}`;
    case 'ROLE_DELETED':
      return `excluiu o papel ${nomeSerializado(registro.antes)}`;
    default:
      return registro.acao;
  }
}

function nomeDoPapel(
  papelId: string | undefined,
  sistema: readonly { id: string; nome: string }[],
  personalizados: readonly PapelPersonalizado[],
  ferramentaId: string,
): string {
  if (!papelId) return 'Automático';
  const doSistema = sistema.find((papel) => papel.id === papelId);
  if (doSistema) return doSistema.nome;
  const personalizado = personalizados.find(
    (papel) => papel.ferramenta === ferramentaId && papel.id === papelId,
  );
  return personalizado?.nome ?? papelId;
}

function ferramentasParaComparar(
  catalogo: Catalogo | undefined,
  acessosAntes: Record<string, string> | undefined,
  acessosDepois: Record<string, string> | undefined,
): FerramentaComparavel[] {
  if (catalogo) {
    return catalogo.ferramentas.map((ferramenta) => ({
      id: ferramenta.id,
      nome: ferramenta.nome,
      papeis: ferramenta.papeis_sistema,
    }));
  }

  const ids: string[] = [];
  for (const mapa of [acessosAntes, acessosDepois]) {
    if (!mapa) continue;
    for (const id of Object.keys(mapa)) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids.map((id) => ({ id, nome: id, papeis: [] }));
}

function diferencasDeAcesso(
  antes: unknown,
  depois: unknown,
  catalogo: Catalogo | undefined,
  personalizados: readonly PapelPersonalizado[],
): string[] {
  const estadoAntes = lerEstado(antes);
  const estadoDepois = lerEstado(depois);

  if (!estadoAntes.acessos && !estadoDepois.acessos) {
    if (estadoAntes.role === estadoDepois.role) return [];
    return [`Papel: ${estadoAntes.role ?? ''} → ${estadoDepois.role ?? ''}`];
  }

  const linhas: string[] = [];
  for (const ferramenta of ferramentasParaComparar(catalogo, estadoAntes.acessos, estadoDepois.acessos)) {
    const idAntes = estadoAntes.acessos?.[ferramenta.id] || undefined;
    const idDepois = estadoDepois.acessos?.[ferramenta.id] || undefined;
    if (idAntes === idDepois) continue;
    const nomeAntes = nomeDoPapel(idAntes, ferramenta.papeis, personalizados, ferramenta.id);
    const nomeDepois = nomeDoPapel(idDepois, ferramenta.papeis, personalizados, ferramenta.id);
    linhas.push(`${ferramenta.nome}: ${nomeAntes} → ${nomeDepois}`);
  }
  return linhas;
}

function diferencasDoRegistro(
  registro: RegistroHistorico,
  catalogo: Catalogo | undefined,
  personalizados: readonly PapelPersonalizado[],
): string[] {
  if (registro.acao !== 'MEMBER_ACCESS_CHANGED') return [];
  return diferencasDeAcesso(registro.antes, registro.depois, catalogo, personalizados);
}

export function HistoricoDeAcesso({ tenantId, catalogo, papeis = [] }: HistoricoDeAcessoProps) {
  const consulta = useInfiniteQuery({
    queryKey: ['historico-acesso', tenantId],
    queryFn: ({ pageParam }) => acessoService.historico(tenantId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.cursor || undefined,
  });

  if (consulta.isPending) {
    return (
      <div className="space-y-2">
        <div className="h-6 animate-pulse rounded bg-slate-100" aria-hidden="true" />
        <div className="h-6 animate-pulse rounded bg-slate-100" aria-hidden="true" />
        <div className="h-6 animate-pulse rounded bg-slate-100" aria-hidden="true" />
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <div role="alert" className="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <p>Não foi possível carregar o histórico.</p>
        <button type="button" onClick={() => void consulta.refetch()} className="font-semibold underline">
          Tentar de novo
        </button>
      </div>
    );
  }

  const registros = consulta.data.pages.flatMap((pagina) => pagina.registros);

  return (
    <div className="space-y-3">
      {registros.length === 0 ? (
        <p>Nenhuma mudança de acesso registrada.</p>
      ) : (
        <ol>
          {registros.map((registro, indice) => (
            <li
              key={`${registro.criado_em}-${registro.acao}-${registro.alvo}-${indice}`}
              className="grid grid-cols-1 gap-x-4 border-b border-slate-100 py-2 sm:grid-cols-[7rem_14rem_1fr]"
            >
              <time dateTime={registro.criado_em} className="tabular-nums text-sm text-slate-500">
                {formatoData.format(new Date(registro.criado_em))}
              </time>
              <span className="min-w-0 truncate text-slate-500">{registro.ator}</span>
              <div className="min-w-0">
                <span className="text-slate-800">{fraseDoRegistro(registro)}</span>
                {diferencasDoRegistro(registro, catalogo, papeis).map((linha) => (
                  <span key={linha} className="block text-sm text-slate-500">{linha}</span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      {consulta.hasNextPage ? (
        <button
          type="button"
          onClick={() => void consulta.fetchNextPage()}
          disabled={consulta.isFetchingNextPage}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          {consulta.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </button>
      ) : null}
    </div>
  );
}
