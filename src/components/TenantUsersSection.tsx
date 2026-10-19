'use client';

import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Key, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { AcessosPorFerramenta, ferramentasExibidas } from '@/components/acessos/AcessosPorFerramenta';
import { ApiError } from '@/lib/apiError';
import { acessoService } from '@/services/acessoService';
import { tenantService } from '@/services/tenantService';
import { useAuthStore } from '@/store/useAuthStore';
import type { AcessosDoUsuario, Catalogo, FerramentaCatalogo, MudancasDeAcesso, PapelPersonalizado } from '@/types/acesso';
import type { AddTenantUserInput, TenantUser as TenantUserBase } from '@/types/tenant';

type TenantUser = TenantUserBase & {
  status: 'ativo' | 'bloqueado';
  acessos: AcessosDoUsuario;
};

interface TenantUsersSectionProps {
  tenantId: string;
  servicosContratados?: string[];
  maxUsuarios?: number;
}

function nomeDoPapel(ferramenta: FerramentaCatalogo, papeis: readonly PapelPersonalizado[], papelId: string): string {
  if (!papelId) return '—';
  const sistema = ferramenta.papeis_sistema.find((papel) => papel.id === papelId);
  if (sistema) return sistema.nome;
  const personalizado = papeis.find((papel) => papel.ferramenta === ferramenta.id && papel.id === papelId);
  return personalizado?.nome ?? papelId;
}

function valorInicial(usuario: TenantUser, ferramentas: readonly FerramentaCatalogo[]): MudancasDeAcesso {
  const valor: MudancasDeAcesso = { portal: 'membro' };
  for (const ferramenta of ferramentas) {
    const acesso = usuario.acessos?.[ferramenta.id];
    if (ferramenta.id === 'portal') {
      valor.portal = acesso?.papel || 'membro';
      continue;
    }
    valor[ferramenta.id] = acesso?.implicito ? '' : (acesso?.papel ?? '');
  }
  return valor;
}

function mudancasDesde(
  inicial: MudancasDeAcesso,
  atual: MudancasDeAcesso,
  ferramentas: readonly FerramentaCatalogo[],
): MudancasDeAcesso {
  const mudancas: MudancasDeAcesso = {};
  for (const ferramenta of ferramentas) {
    const antes = inicial[ferramenta.id] ?? (ferramenta.id === 'portal' ? 'membro' : '');
    const depois = atual[ferramenta.id] ?? (ferramenta.id === 'portal' ? 'membro' : '');
    if (antes !== depois) mudancas[ferramenta.id] = depois;
  }
  return mudancas;
}

function acessosPreenchidos(valor: MudancasDeAcesso): MudancasDeAcesso {
  const limpos: MudancasDeAcesso = {};
  for (const ferramenta of ['portal', 'crm', 'blog', 'lp'] as const) {
    const papel = valor[ferramenta];
    if (papel) limpos[ferramenta] = papel;
  }
  return limpos;
}

function mensagemSalvar(erro: unknown): string {
  if (erro instanceof ApiError) {
    switch (erro.message) {
      case 'ultimo_administrador':
        return 'A empresa precisa de pelo menos um Administrador do Portal ativo.';
      case 'papel_invalido':
        return 'Esse papel não vale para essa ferramenta.';
      case 'usuario_fora_da_empresa':
        return 'Esta pessoa não está mais nesta empresa.';
      default:
        return 'Não foi possível salvar. Tente de novo.';
    }
  }
  return 'Não foi possível salvar. Tente de novo.';
}

function mensagemConvite(erro: unknown): string {
  if (erro instanceof ApiError && erro.message === 'papel_invalido') {
    return 'Esse papel não vale para essa ferramenta.';
  }
  return 'Não foi possível convidar. Tente de novo.';
}

function FormularioEditar({
  tenantId,
  usuario,
  catalogo,
  papeis,
  ferramentas,
  proprio,
  aoFechar,
}: {
  tenantId: string;
  usuario: TenantUser;
  catalogo: Catalogo;
  papeis: PapelPersonalizado[];
  ferramentas: FerramentaCatalogo[];
  proprio: boolean;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [inicial] = useState(() => valorInicial(usuario, ferramentas));
  const [nome, setNome] = useState(() => usuario.name);
  const [valor, setValor] = useState(inicial);
  const [bloqueado, setBloqueado] = useState(() => usuario.status === 'bloqueado');
  const [confirmarSenha, setConfirmarSenha] = useState(false);
  const [senhaEnviada, setSenhaEnviada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      const mudancas = mudancasDesde(inicial, valor, ferramentas);
      const nomeMudou = nome.trim() !== usuario.name;
      const bloqueioMudou = bloqueado !== (usuario.status === 'bloqueado');
      if (Object.keys(mudancas).length === 0 && !nomeMudou && !bloqueioMudou) return false;
      if (Object.keys(mudancas).length > 0) {
        await tenantService.updateUserAcessos(tenantId, usuario.email, mudancas);
      }
      if (nomeMudou) await tenantService.updateUserName(tenantId, usuario.email, nome.trim());
      if (bloqueioMudou) await tenantService.blockUser(tenantId, usuario.email, bloqueado);
      return true;
    },
    onSuccess: async (gravou) => {
      if (gravou) await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      aoFechar();
    },
    onError: (falha) => setErro(mensagemSalvar(falha)),
  });

  const enviarSenha = useMutation({
    mutationFn: () => tenantService.resetUserPassword(tenantId, usuario.email),
    onSuccess: () => setSenhaEnviada(true),
    onError: () => setErroSenha(true),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (proprio || salvar.isPending) return;
    setErro(null);
    salvar.mutate();
  }

  return (
    <>
      <Dialog.Title className="text-xl font-bold text-slate-900">{usuario.name}</Dialog.Title>
      <Dialog.Description className="text-sm text-slate-500 mb-4">{usuario.email}</Dialog.Description>

      <form onSubmit={enviar} className="space-y-4">
        {proprio ? <p className="text-sm text-amber-600">Você não pode alterar seu próprio perfil.</p> : null}

        <div className="space-y-1">
          <label htmlFor="editar-nome" className="text-sm font-semibold text-slate-700">Nome</label>
          <input
            id="editar-nome"
            type="text"
            value={nome}
            disabled={proprio}
            onChange={(evento) => setNome(evento.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Acesso por ferramenta</p>
          <AcessosPorFerramenta
            catalogo={catalogo}
            papeis={papeis}
            servicosContratados={ferramentas.map((ferramenta) => ferramenta.servico).filter((servico) => servico !== '')}
            valor={valor}
            aoMudar={setValor}
            desabilitado={proprio}
          />
        </div>

        <label htmlFor="bloquear-acesso" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            id="bloquear-acesso"
            type="checkbox"
            checked={bloqueado}
            disabled={proprio}
            onChange={(evento) => setBloqueado(evento.target.checked)}
          />
          Bloquear acesso a esta empresa
        </label>

        {erro ? (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
        ) : null}
        {erroSenha ? (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Não foi possível enviar a senha temporária. Tente de novo.
          </div>
        ) : null}
        {senhaEnviada ? <p role="status" className="text-sm text-slate-700">Senha temporária enviada.</p> : null}

        {confirmarSenha && !senhaEnviada ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700">Enviar uma senha temporária para {usuario.email}?</p>
            <button
              type="button"
              onClick={() => enviarSenha.mutate()}
              disabled={proprio || enviarSenha.isPending}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Enviar senha temporária
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setConfirmarSenha(true)}
            disabled={proprio || enviarSenha.isPending}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 bg-slate-50 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            {enviarSenha.isPending ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} aria-hidden="true" />}
            Redefinir senha
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={aoFechar}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={proprio || salvar.isPending}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {salvar.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
              Salvar
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function FormularioConvite({
  tenantId,
  catalogo,
  papeis,
  servicosContratados,
  quantidadeAtual,
  maxUsuarios,
  aoFechar,
}: {
  tenantId: string;
  catalogo: Catalogo;
  papeis: PapelPersonalizado[];
  servicosContratados: string[];
  quantidadeAtual: number;
  maxUsuarios?: number;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [valor, setValor] = useState<MudancasDeAcesso>({ portal: 'membro' });
  const [erros, setErros] = useState<{ nome?: string; email?: string }>({});
  const [erroApi, setErroApi] = useState<string | null>(null);

  const acimaDoLimite = (maxUsuarios ?? 0) > 0 && quantidadeAtual >= (maxUsuarios ?? 0);

  const convidar = useMutation({
    mutationFn: () => {
      const entrada: AddTenantUserInput = {
        name: nome.trim(),
        email: email.trim(),
        acessos: acessosPreenchidos(valor),
      };
      return tenantService.addUser(tenantId, entrada);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      aoFechar();
    },
    onError: (falha) => setErroApi(mensagemConvite(falha)),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos: { nome?: string; email?: string } = {};
    if (!nome.trim()) novos.nome = 'Nome é obrigatório';
    if (!email.trim()) novos.email = 'E-mail é obrigatório';
    setErros(novos);
    if (novos.nome || novos.email || convidar.isPending) return;
    setErroApi(null);
    convidar.mutate();
  }

  return (
    <>
      <Dialog.Title className="text-xl font-bold text-slate-900 mb-4">Convidar pessoa</Dialog.Title>
      <form onSubmit={enviar} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="convidar-nome" className="text-sm font-semibold text-slate-700">Nome</label>
          <input
            id="convidar-nome"
            type="text"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {erros.nome ? <p className="text-sm text-red-600">{erros.nome}</p> : null}
        </div>
        <div className="space-y-1">
          <label htmlFor="convidar-email" className="text-sm font-semibold text-slate-700">E-mail</label>
          <input
            id="convidar-email"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {erros.email ? <p className="text-sm text-red-600">{erros.email}</p> : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Acesso por ferramenta</p>
          <AcessosPorFerramenta
            catalogo={catalogo}
            papeis={papeis}
            servicosContratados={servicosContratados}
            valor={valor}
            aoMudar={setValor}
          />
        </div>

        {acimaDoLimite ? (
          <p className="text-sm text-amber-700">
            O plano permite {maxUsuarios} usuários; esta será a {quantidadeAtual + 1}ª pessoa. Convidar assim mesmo?
          </p>
        ) : null}

        {erroApi ? (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroApi}</div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={convidar.isPending}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {convidar.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            {acimaDoLimite ? 'Convidar acima do limite' : 'Convidar pessoa'}
          </button>
        </div>
      </form>
    </>
  );
}

function ConfirmacaoRemocao({
  tenantId,
  usuario,
  aoFechar,
}: {
  tenantId: string;
  usuario: TenantUser;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [falhou, setFalhou] = useState(false);

  const remover = useMutation({
    mutationFn: () => tenantService.removeUser(tenantId, usuario.email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      aoFechar();
    },
    onError: () => setFalhou(true),
  });

  return (
    <>
      <AlertDialog.Title className="text-xl font-bold text-slate-900">
        Remover {usuario.name} desta empresa?
      </AlertDialog.Title>
      {falhou ? (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível remover. Tente de novo.
        </div>
      ) : null}
      <div className="flex gap-3 mt-2">
        <AlertDialog.Cancel asChild>
          <button type="button" className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
            Cancelar
          </button>
        </AlertDialog.Cancel>
        <button
          type="button"
          onClick={() => remover.mutate()}
          disabled={remover.isPending}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    </>
  );
}

export function TenantUsersSection({ tenantId, servicosContratados = [], maxUsuarios }: TenantUsersSectionProps) {
  const { user } = useAuthStore();
  const emailLogado = user?.email;
  const [editando, setEditando] = useState<TenantUser | null>(null);
  const [convidando, setConvidando] = useState(false);
  const [removendo, setRemovendo] = useState<TenantUser | null>(null);

  const usuariosQuery = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => tenantService.listUsers(tenantId) as Promise<TenantUser[]>,
  });
  const catalogoQuery = useQuery({
    queryKey: ['acessos-catalogo'],
    queryFn: () => acessoService.catalogo(),
  });
  const papeisQuery = useQuery({
    queryKey: ['papeis'],
    queryFn: () => acessoService.listarPapeis(),
  });

  const usuarios = usuariosQuery.data ?? [];
  const catalogo = catalogoQuery.data;
  const papeis = papeisQuery.data ?? [];
  const ferramentas = catalogo ? ferramentasExibidas(catalogo, servicosContratados) : [];
  const acima = (maxUsuarios ?? 0) > 0 && usuarios.length > (maxUsuarios ?? 0);
  // Sem catálogo ou papéis, não há como montar os seletores: a tela diz e
  // trava convidar e editar, em vez de abrir uma gaveta vazia (Verifier G4).
  const papeisIndisponiveis = catalogoQuery.isError || papeisQuery.isError;
  const papeisCarregando = catalogoQuery.isPending || papeisQuery.isPending;
  const motivoSemEdicao = papeisIndisponiveis ? 'Os papéis não carregaram.' : papeisCarregando ? 'Carregando os papéis…' : undefined;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mt-6">
      <div className="flex justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} aria-hidden="true" />
            Usuários
          </h2>
          {(maxUsuarios ?? 0) > 0 ? (
            <p className="text-sm text-slate-500 mt-1">
              {usuarios.length} de {maxUsuarios} usuários
              {acima ? <span className="text-amber-600"> — acima do limite do plano</span> : null}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setConvidando(true)}
          disabled={motivoSemEdicao !== undefined}
          title={motivoSemEdicao}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} aria-hidden="true" />
          Convidar
        </button>
      </div>

      {papeisIndisponiveis ? (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>Não foi possível carregar os papéis. Os acessos não podem ser editados agora.</span>
          <button
            type="button"
            onClick={() => { void catalogoQuery.refetch(); void papeisQuery.refetch(); }}
            className="whitespace-nowrap font-semibold underline"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {usuariosQuery.isPending ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      ) : usuariosQuery.isError ? (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os usuários.
        </div>
      ) : usuarios.length === 0 ? (
        <div className="text-slate-500 py-8 text-center border-2 border-dashed border-slate-100 rounded-lg">
          Nenhum usuário vinculado a esta empresa.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table lang="pt-BR" className="table-fixed w-full border-collapse text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" className="w-[26%] px-3 py-3 font-semibold">Nome / E-mail</th>
                {ferramentas.map((ferramenta) => (
                  <th key={ferramenta.id} scope="col" className="px-2 py-3 font-semibold hyphens-auto">{ferramenta.nome}</th>
                ))}
                <th scope="col" className="w-[5.75rem] px-2 py-3 font-semibold">Status</th>
                <th scope="col" className="w-[4.5rem] px-2 py-3 font-semibold"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border-t border-slate-100">
              {usuarios.map((usuario) => (
                <tr key={usuario.email} className="hover:bg-slate-50/50">
                  <td className="px-3 py-3 overflow-hidden">
                    <div className="truncate font-medium text-slate-900" title={usuario.name}>{usuario.name}</div>
                    <div className="truncate" title={usuario.email}>{usuario.email}</div>
                  </td>
                  {ferramentas.map((ferramenta) => {
                    const acesso = usuario.acessos?.[ferramenta.id];
                    return (
                      <td key={ferramenta.id} className="px-2 py-3 hyphens-auto">
                        {nomeDoPapel(ferramenta, papeis, acesso?.papel ?? '')}
                        {acesso?.implicito ? (
                          <span
                            title={
                              ferramenta.servico === ''
                                ? 'Não gravado: toda pessoa da empresa é pelo menos Membro do Portal'
                                : acesso.papel === 'sem_acesso'
                                  ? 'Não gravado: sem acesso, porque não é Administrador do Portal'
                                  : 'Não gravado: vale o papel mais alto, porque é Administrador do Portal'
                            }
                            aria-label="implícito"
                          >
                            *
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-2 py-3">
                    <span className={`whitespace-nowrap px-2 py-1 rounded-full text-[10px] font-bold tracking-wider ${usuario.status === 'bloqueado' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                      {usuario.status === 'bloqueado' ? 'Bloqueado' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Editar acesso de ${usuario.name}`}
                        onClick={() => setEditando(usuario)}
                        disabled={motivoSemEdicao !== undefined}
                        title={motivoSemEdicao}
                        className="rounded-lg p-1 text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${usuario.name}`}
                        onClick={() => setRemovendo(usuario)}
                        disabled={usuario.email === emailLogado}
                        title={usuario.email === emailLogado ? 'Você não pode remover a própria conta.' : undefined}
                        className="rounded-lg p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog.Root open={editando !== null} onOpenChange={(aberto) => { if (!aberto) setEditando(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content className="fixed right-0 top-0 bottom-0 z-[100] w-[400px] bg-white p-6 shadow-xl overflow-y-auto">
            {editando && catalogo ? (
              <FormularioEditar
                key={`${editando.email}:${ferramentas.map((ferramenta) => ferramenta.id).join(',')}`}
                tenantId={tenantId}
                usuario={editando}
                catalogo={catalogo}
                papeis={papeis}
                ferramentas={ferramentas}
                proprio={editando.email === emailLogado}
                aoFechar={() => setEditando(null)}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={convidando} onOpenChange={(aberto) => { if (!aberto) setConvidando(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content
            className="fixed right-0 top-0 bottom-0 z-[100] w-[400px] bg-white p-6 shadow-xl overflow-y-auto"
            aria-describedby={undefined}
          >
            {catalogo ? (
              <FormularioConvite
                key={`convidar:${ferramentas.map((ferramenta) => ferramenta.id).join(',')}`}
                tenantId={tenantId}
                catalogo={catalogo}
                papeis={papeis}
                servicosContratados={servicosContratados}
                quantidadeAtual={usuarios.length}
                maxUsuarios={maxUsuarios}
                aoFechar={() => setConvidando(false)}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={removendo !== null} onOpenChange={(aberto) => { if (!aberto) setRemovendo(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-slate-900/60" />
          <AlertDialog.Content
            className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-white p-6 shadow-lg sm:rounded-2xl"
            aria-describedby={undefined}
          >
            {removendo ? (
              <ConfirmacaoRemocao
                key={removendo.email}
                tenantId={tenantId}
                usuario={removendo}
                aoFechar={() => setRemovendo(null)}
              />
            ) : null}
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
