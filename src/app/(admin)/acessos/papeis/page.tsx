'use client';

import { Suspense, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { PapelDrawer } from '@/components/acessos/PapelDrawer';
import { ExcluirPapelDialog } from '@/components/acessos/ExcluirPapelDialog';
import { HistoricoDeAcesso } from '@/components/acessos/HistoricoDeAcesso';
import { acessoService } from '@/services/acessoService';
import type { Catalogo, FerramentaCatalogo, PapelPersonalizado } from '@/types/acesso';

type Gaveta = { modo: 'novo' } | { modo: 'editar'; papel: PapelPersonalizado } | null;

function textoDasPermissoes(ids: string[], ferramenta: FerramentaCatalogo): string {
  if (ids.length === 0) return '';
  return ids
    .map((id) => ferramenta.permissoes.find((permissao) => permissao.id === id)?.nome ?? id)
    .join(', ');
}

function abaSelecionada(pedida: string | null, ids: string[]): string {
  if (pedida === 'historico') return 'historico';
  if (pedida && ids.includes(pedida)) return pedida;
  return ids[0] ?? 'historico';
}

function Carregando() {
  return (
    <div className="space-y-2">
      <div className="h-10 animate-pulse rounded bg-slate-100" aria-hidden="true" />
      <div className="h-10 animate-pulse rounded bg-slate-100" aria-hidden="true" />
      <div className="h-10 animate-pulse rounded bg-slate-100" aria-hidden="true" />
    </div>
  );
}

function CelulaPermissoes({ ids, ferramenta }: { ids: string[]; ferramenta: FerramentaCatalogo }) {
  const texto = textoDasPermissoes(ids, ferramenta);
  if (!texto) return <>—</>;
  return (
    <span className="block max-w-md truncate" title={texto}>
      {texto}
    </span>
  );
}

function PapeisConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gaveta, setGaveta] = useState<Gaveta>(null);
  const [papelExcluir, setPapelExcluir] = useState<PapelPersonalizado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const catalogoQuery = useQuery({
    queryKey: ['acessos-catalogo'],
    queryFn: () => acessoService.catalogo(),
  });
  const papeisQuery = useQuery({
    queryKey: ['papeis'],
    queryFn: () => acessoService.listarPapeis(),
  });

  function mostrarAviso(texto: string) {
    if (timerAviso.current !== null) clearTimeout(timerAviso.current);
    setAviso(texto);
    timerAviso.current = setTimeout(() => {
      setAviso(null);
      timerAviso.current = null;
    }, 4000);
  }

  function irParaAba(id: string, focar: boolean) {
    router.replace(`/acessos/papeis?ferramenta=${id}`);
    if (focar) document.getElementById(`aba-${id}`)?.focus();
  }

  const catalogo: Catalogo | undefined = catalogoQuery.data;
  const ids = catalogo?.ferramentas.map((ferramenta) => ferramenta.id) ?? [];
  const abaAtiva = abaSelecionada(searchParams.get('ferramenta'), ids);
  const ferramentaAtiva = catalogo?.ferramentas.find((ferramenta) => ferramenta.id === abaAtiva);
  const personalizados = (papeisQuery.data ?? [])
    .filter((papel) => papel.ferramenta === ferramentaAtiva?.id)
    .toSorted((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const ferramentaDaGaveta = (() => {
    if (!catalogo || !gaveta) return undefined;
    if (gaveta.modo === 'editar') {
      return catalogo.ferramentas.find((ferramenta) => ferramenta.id === gaveta.papel.ferramenta);
    }
    return ferramentaAtiva;
  })();

  function aoTecladoDasAbas(evento: KeyboardEvent<HTMLDivElement>) {
    if (!catalogo) return;
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    const abas = [...catalogo.ferramentas.map((ferramenta) => ferramenta.id), 'historico'];
    const indice = abas.indexOf(abaAtiva);
    const atual = indice === -1 ? 0 : indice;
    const passo = evento.key === 'ArrowRight' ? 1 : -1;
    const proxima = abas[(atual + passo + abas.length) % abas.length];
    if (proxima) irParaAba(proxima, true);
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Papéis</h1>
          <p className="text-slate-500">O que cada pessoa pode fazer em cada ferramenta das empresas.</p>
        </div>
        <div className="flex items-center gap-3">
          {aviso ? <p role="status" className="text-sm text-slate-600">{aviso}</p> : null}
          {abaAtiva !== 'historico' ? (
            <button
              type="button"
              onClick={() => setGaveta({ modo: 'novo' })}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
            >
              <Plus size={16} aria-hidden="true" />
              Novo papel
            </button>
          ) : null}
        </div>
      </div>

      {catalogoQuery.isError || papeisQuery.isError ? (
        <div role="alert" className="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>Não foi possível carregar os papéis.</p>
          <button
            type="button"
            onClick={() => {
              void catalogoQuery.refetch();
              void papeisQuery.refetch();
            }}
            className="font-semibold underline"
          >
            Tentar de novo
          </button>
        </div>
      ) : catalogoQuery.isPending || papeisQuery.isPending || !catalogo ? (
        <Carregando />
      ) : (
        <>
          <div role="tablist" aria-label="Ferramentas" className="flex gap-1 border-b border-slate-200" onKeyDown={aoTecladoDasAbas}>
            {catalogo.ferramentas.map((ferramenta) => {
              const selecionada = abaAtiva === ferramenta.id;
              return (
                <button
                  key={ferramenta.id}
                  type="button"
                  role="tab"
                  id={`aba-${ferramenta.id}`}
                  aria-selected={selecionada}
                  aria-controls="painel-acessos"
                  tabIndex={selecionada ? 0 : -1}
                  onClick={() => irParaAba(ferramenta.id, false)}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${selecionada ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {ferramenta.nome}
                </button>
              );
            })}
            <button
              type="button"
              role="tab"
              id="aba-historico"
              aria-selected={abaAtiva === 'historico'}
              aria-controls="painel-acessos"
              tabIndex={abaAtiva === 'historico' ? 0 : -1}
              onClick={() => irParaAba('historico', false)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${abaAtiva === 'historico' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Histórico
            </button>
          </div>

          <div role="tabpanel" id="painel-acessos" aria-labelledby={`aba-${abaAtiva}`} className="pt-6">
            {abaAtiva === 'historico' ? (
              <HistoricoDeAcesso tenantId="PLATFORM" catalogo={catalogo} papeis={papeisQuery.data} />
            ) : ferramentaAtiva ? (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th scope="col" className="py-2 pr-4 font-semibold">Papel</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Permissões</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Tipo</th>
                      <th scope="col" className="py-2 font-semibold"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ferramentaAtiva.papeis_sistema.map((papel) => (
                      <tr key={`sistema-${papel.id}`} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-800">{papel.nome}</td>
                        <td className="py-3 pr-4 text-slate-600">
                          <CelulaPermissoes ids={papel.permissoes} ferramenta={ferramentaAtiva} />
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                            title="Papel padrão do produto. Não pode ser alterado."
                          >
                            Padrão
                          </span>
                        </td>
                        <td className="py-3" />
                      </tr>
                    ))}
                    {personalizados.map((papel) => (
                      <tr key={papel.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-800">{papel.nome}</td>
                        <td className="py-3 pr-4 text-slate-600">
                          <CelulaPermissoes ids={papel.permissoes} ferramenta={ferramentaAtiva} />
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-600">
                            Personalizado
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`Editar papel ${papel.nome}`}
                              onClick={() => setGaveta({ modo: 'editar', papel })}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Edit2 size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir papel ${papel.nome}`}
                              onClick={() => setPapelExcluir(papel)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {personalizados.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Nenhum papel personalizado no {ferramentaAtiva.nome}. Crie um quando os padrões não servirem.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </>
      )}

      {ferramentaDaGaveta ? (
        <PapelDrawer
          aberto
          ferramenta={ferramentaDaGaveta}
          papel={gaveta?.modo === 'editar' ? gaveta.papel : undefined}
          aoFechar={() => setGaveta(null)}
          aoSalvo={() => {
            void queryClient.invalidateQueries({ queryKey: ['papeis'] });
            mostrarAviso('Papel salvo');
          }}
        />
      ) : null}

      {papelExcluir ? (
        <ExcluirPapelDialog
          aberto
          papel={papelExcluir}
          aoFechar={() => setPapelExcluir(null)}
          aoExcluido={() => {
            void queryClient.invalidateQueries({ queryKey: ['papeis'] });
            mostrarAviso('Papel excluído');
          }}
        />
      ) : null}
    </div>
  );
}

export default function PaginaPapeis() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <h1 className="text-2xl font-bold">Papéis</h1>
          <p className="text-slate-500 mb-8">O que cada pessoa pode fazer em cada ferramenta das empresas.</p>
          <Carregando />
        </div>
      }
    >
      <PapeisConteudo />
    </Suspense>
  );
}
