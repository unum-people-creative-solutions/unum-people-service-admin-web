'use client';

import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { ApiError } from '@/lib/apiError';
import { acessoService } from '@/services/acessoService';
import type { FerramentaCatalogo, PapelPersonalizado, PermissaoCatalogo } from '@/types/acesso';

interface PapelDrawerProps {
  aberto: boolean;
  ferramenta: FerramentaCatalogo;
  papel?: PapelPersonalizado;
  aoFechar: () => void;
  aoSalvo: (papel: PapelPersonalizado) => void;
}

// Marcar inclui o que a permissão exige, em cadeia. A ordem segue o catálogo.
export function fechoRequer(ids: readonly string[], catalogo: readonly PermissaoCatalogo[]): string[] {
  const exigidas = new Map(catalogo.map((permissao) => [permissao.id, permissao.requer]));
  const alcance = new Set<string>();
  const fila = [...ids];

  while (fila.length > 0) {
    const atual = fila.pop();
    if (atual === undefined || alcance.has(atual)) continue;
    alcance.add(atual);
    for (const exigida of exigidas.get(atual) ?? []) {
      if (!alcance.has(exigida)) fila.push(exigida);
    }
  }

  return catalogo.map((permissao) => permissao.id).filter((id) => alcance.has(id));
}

// Desmarcar tira quem depende desta permissão, direta ou indiretamente.
export function dependentesDe(id: string, catalogo: readonly PermissaoCatalogo[]): string[] {
  const dependentes = new Map<string, string[]>();
  for (const permissao of catalogo) {
    for (const exigida of permissao.requer) {
      const lista = dependentes.get(exigida) ?? [];
      lista.push(permissao.id);
      dependentes.set(exigida, lista);
    }
  }

  const alcance = new Set<string>([id]);
  const fila = [...(dependentes.get(id) ?? [])];
  while (fila.length > 0) {
    const atual = fila.pop();
    if (atual === undefined || alcance.has(atual)) continue;
    alcance.add(atual);
    for (const proximo of dependentes.get(atual) ?? []) {
      if (!alcance.has(proximo)) fila.push(proximo);
    }
  }

  alcance.delete(id);
  return catalogo.map((permissao) => permissao.id).filter((item) => alcance.has(item));
}

function nomesRequeridos(ids: readonly string[], catalogo: readonly PermissaoCatalogo[]): string {
  return ids.map((id) => catalogo.find((permissao) => permissao.id === id)?.nome ?? id).join(', ');
}

function lerFaltando(detalhes: unknown): string[] {
  if (typeof detalhes !== 'object' || detalhes === null) return [];
  const faltando = (detalhes as { faltando?: unknown }).faltando;
  if (!Array.isArray(faltando)) return [];
  return faltando.filter((id): id is string => typeof id === 'string');
}

function mensagemDeSalvar(erro: unknown, ferramenta: FerramentaCatalogo): string {
  if (!(erro instanceof ApiError)) {
    return 'Não foi possível salvar o papel. Tente de novo.';
  }
  switch (erro.message) {
    case 'nome_em_uso':
      return `Já existe um papel com esse nome no ${ferramenta.nome}.`;
    case 'permissao_requer':
      return `Faltam permissões que estas exigem: ${nomesRequeridos(lerFaltando(erro.detalhes), ferramenta.permissoes)}.`;
    case 'permissao_invalida':
      return 'Há uma permissão que não é desta ferramenta.';
    case 'papel_invalido':
      return 'Confira o nome do papel.';
    case 'papel_nao_encontrado':
      return 'Este papel não existe mais. Feche e atualize a lista.';
    default:
      return 'Não foi possível salvar o papel. Tente de novo.';
  }
}

function rotulo(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function FormularioDoPapel({
  ferramenta,
  papel,
  aoFechar,
  aoSalvo,
}: {
  ferramenta: FerramentaCatalogo;
  papel?: PapelPersonalizado;
  aoFechar: () => void;
  aoSalvo: (papel: PapelPersonalizado) => void;
}) {
  const [nome, setNome] = useState(() => papel?.nome ?? '');
  const [descricao, setDescricao] = useState(() => papel?.descricao ?? '');
  const [selecionadas, setSelecionadas] = useState(() => fechoRequer(papel?.permissoes ?? [], ferramenta.permissoes));
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const uso = useQuery({
    queryKey: ['papel-uso', ferramenta.id, papel?.id],
    queryFn: () => acessoService.usoDoPapel(ferramenta.id, papel?.id ?? ''),
    enabled: !!papel,
  });

  const salvar = useMutation({
    mutationFn: () => {
      const permissoes = ferramenta.permissoes.map((permissao) => permissao.id).filter((id) => selecionadas.includes(id));
      const entrada = { nome: nome.trim(), descricao: descricao.trim(), permissoes };
      if (papel) {
        return acessoService.atualizarPapel(papel.ferramenta, papel.id, entrada);
      }
      return acessoService.criarPapel({ ferramenta: ferramenta.id, ...entrada });
    },
    onSuccess: (resultado) => {
      aoSalvo(resultado);
      aoFechar();
    },
    onError: (erro) => {
      setMensagemErro(mensagemDeSalvar(erro, ferramenta));
    },
  });

  function alternar(id: string, marcado: boolean) {
    setSelecionadas((atuais) => {
      if (marcado) return fechoRequer([...atuais, id], ferramenta.permissoes);
      const remover = new Set([id, ...dependentesDe(id, ferramenta.permissoes)]);
      return ferramenta.permissoes.map((permissao) => permissao.id).filter((item) => atuais.includes(item) && !remover.has(item));
    });
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nome.trim() === '' || selecionadas.length === 0 || salvar.isPending) return;
    setMensagemErro(null);
    salvar.mutate();
  }

  const nomeVazio = nome.trim() === '';
  const semPermissao = selecionadas.length === 0;
  const titulo = papel ? `Editar papel — ${ferramenta.nome}` : `Novo papel — ${ferramenta.nome}`;

  return (
    <>
      <Dialog.Title asChild>
        <h2 className="text-xl font-bold mb-4">{titulo}</h2>
      </Dialog.Title>

      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label htmlFor="papel-nome" className="block text-sm font-semibold mb-1">Nome</label>
          <input
            id="papel-nome"
            value={nome}
            maxLength={60}
            onChange={(evento) => setNome(evento.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label htmlFor="papel-descricao" className="block text-sm font-semibold mb-1">Descrição (opcional)</label>
          <textarea
            id="papel-descricao"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            className="w-full border p-2 rounded"
            rows={3}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="block text-sm font-semibold mb-1">Permissões</legend>
          {ferramenta.permissoes.map((permissao) => (
            <div key={permissao.id}>
              <label htmlFor={permissao.id} className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  id={permissao.id}
                  type="checkbox"
                  checked={selecionadas.includes(permissao.id)}
                  onChange={(evento) => alternar(permissao.id, evento.currentTarget.checked)}
                />
                <span>{permissao.nome}</span>
                <span className="font-mono text-xs text-slate-400">{permissao.id}</span>
              </label>
              {permissao.requer.length > 0 ? (
                <p className="ml-6 text-xs text-slate-500">
                  requer: {nomesRequeridos(permissao.requer, ferramenta.permissoes)}
                </p>
              ) : null}
            </div>
          ))}
        </fieldset>

        {papel && uso.data && uso.data.em_uso > 0 ? (
          <p role="note" className="flex gap-2 rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Em uso por {rotulo(uso.data.em_uso, 'pessoa', 'pessoas')} em {rotulo(uso.data.empresas.length, 'empresa', 'empresas')}. A mudança vale para todas em até 1 minuto.
            </span>
          </p>
        ) : null}

        {mensagemErro ? (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {mensagemErro}
          </div>
        ) : null}

        <div className="space-y-2">
          {nomeVazio ? <p className="text-sm text-slate-500">Dê um nome ao papel</p> : null}
          {semPermissao ? <p className="text-sm text-slate-500">Escolha pelo menos uma permissão</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="whitespace-nowrap px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={nomeVazio || semPermissao || salvar.isPending}
              className="whitespace-nowrap bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvar.isPending ? 'Salvando…' : 'Salvar papel'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export function PapelDrawer({ aberto, ferramenta, papel, aoFechar, aoSalvo }: PapelDrawerProps) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(estaAberto) => { if (!estaAberto) aoFechar(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed right-0 top-0 bottom-0 w-[400px] bg-white p-6 shadow-xl overflow-y-auto"
          role="dialog"
          aria-describedby={undefined}
        >
          {/* O Content desmonta ao fechar. A key recria o formulário se o papel mudar com a gaveta aberta. */}
          <FormularioDoPapel
            key={`${ferramenta.id}:${papel?.id ?? 'novo'}`}
            ferramenta={ferramenta}
            papel={papel}
            aoFechar={aoFechar}
            aoSalvo={aoSalvo}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
