'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/apiError';
import { acessoService } from '@/services/acessoService';
import type { PapelPersonalizado } from '@/types/acesso';

interface ExcluirPapelDialogProps {
  aberto: boolean;
  papel: PapelPersonalizado;
  aoFechar: () => void;
  aoExcluido: () => void;
}

function lerEmUso(detalhes: unknown): number {
  if (typeof detalhes !== 'object' || detalhes === null) return 0;
  const valor = (detalhes as { em_uso?: unknown }).em_uso;
  return typeof valor === 'number' ? valor : 0;
}

function ConfirmacaoDeExclusao({
  papel,
  aoFechar,
  aoExcluido,
}: {
  papel: PapelPersonalizado;
  aoFechar: () => void;
  aoExcluido: () => void;
}) {
  const [emUso, setEmUso] = useState<number | null>(null);
  const [erroGenerico, setErroGenerico] = useState(false);

  const uso = useQuery({
    queryKey: ['papel-uso', papel.ferramenta, papel.id],
    queryFn: () => acessoService.usoDoPapel(papel.ferramenta, papel.id),
    enabled: emUso !== null,
  });

  const excluir = useMutation({
    mutationFn: () => acessoService.excluirPapel(papel.ferramenta, papel.id),
    onSuccess: () => {
      aoExcluido();
      aoFechar();
    },
    onError: (erro) => {
      if (erro instanceof ApiError && erro.message === 'papel_em_uso') {
        setEmUso(lerEmUso(erro.detalhes));
        setErroGenerico(false);
        return;
      }
      setEmUso(null);
      setErroGenerico(true);
    },
  });

  const bloqueado = emUso !== null;
  const descricao = bloqueado
    ? `Em uso por ${emUso} pessoas. Troque o papel delas antes de excluir.`
    : 'As pessoas que já o têm ficam sem esse papel. Antes, reatribua.';

  return (
    <>
      <AlertDialog.Title className="text-xl font-bold">
        Excluir o papel {papel.nome}?
      </AlertDialog.Title>
      <AlertDialog.Description className="text-slate-600 text-sm leading-relaxed">
        {descricao}
      </AlertDialog.Description>

      {bloqueado && uso.data ? (
        <ul className="space-y-2 text-sm">
          {uso.data.empresas.map((empresa) => (
            <li key={empresa.tenant_id}>
              <Link
                href={`/tenants/${encodeURIComponent(empresa.tenant_id)}`}
                className="text-primary-700 underline"
              >
                {empresa.nome_negocio || empresa.tenant_id} — {empresa.usuarios} {empresa.usuarios === 1 ? 'pessoa' : 'pessoas'}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {erroGenerico ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível excluir o papel. Tente de novo.
        </p>
      ) : null}

      <div className="flex gap-4 mt-2">
        <AlertDialog.Cancel asChild>
          <button
            type="button"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
          >
            {bloqueado ? 'Fechar' : 'Cancelar'}
          </button>
        </AlertDialog.Cancel>
        {bloqueado ? null : (
          <button
            type="button"
            onClick={() => excluir.mutate()}
            disabled={excluir.isPending}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            Excluir
          </button>
        )}
      </div>
    </>
  );
}

export function ExcluirPapelDialog({ aberto, papel, aoFechar, aoExcluido }: ExcluirPapelDialogProps) {
  return (
    <AlertDialog.Root open={aberto} onOpenChange={(estaAberto) => { if (!estaAberto) aoFechar(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-[50%] top-[50%] z-[100] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 bg-white p-6 shadow-lg sm:rounded-2xl">
          {/* O Content desmonta ao fechar. A key limpa o 409 se outro papel abrir no mesmo diálogo. */}
          <ConfirmacaoDeExclusao
            key={`${papel.ferramenta}:${papel.id}`}
            papel={papel}
            aoFechar={aoFechar}
            aoExcluido={aoExcluido}
          />
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
