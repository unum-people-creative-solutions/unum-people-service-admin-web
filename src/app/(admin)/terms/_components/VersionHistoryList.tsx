"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { termService } from '@/services/termService';
import { Term } from '@/types/term';

interface VersionHistoryListProps {
  term: Term;
}

export function VersionHistoryList({ term }: VersionHistoryListProps) {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['term-versions', term.id],
    queryFn: () => termService.listVersions(term.id),
  });

  const deleteMutation = useMutation({
    mutationFn: (version: number) => termService.deleteVersion(term.id, version),
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['term-versions', term.id] });
    },
    onError: () => {
      // Não distinguimos 409 de outros erros aqui de propósito: o cliente HTTP
      // (src/lib/api.ts) não propaga o status code, só a mensagem — mesma
      // limitação já presente na tela de Planos. A mensagem cobre o caso mais
      // comum de bloqueio (versão com aceite vinculado) sem afirmar categoria.
      setDeleteError('Não é possível excluir: verifique se esta versão já foi aceita por algum tenant.');
    },
  });

  if (isLoading) return <p className="text-xs text-slate-500">Carregando versões...</p>;

  const versions = data ?? [];

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="text-sm font-semibold mb-2">Histórico de versões</h4>
      {deleteError && (
        <p role="alert" className="text-red-600 text-xs mb-2">{deleteError}</p>
      )}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.version_number} className="flex justify-between items-center text-sm">
            <div>
              {v.content_html_url ? (
                <a href={v.content_html_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  v{v.version_number}
                </a>
              ) : (
                <span>v{v.version_number}</span>
              )}
              {v.changelog && <span className="text-xs text-slate-500 ml-2">{v.changelog}</span>}
            </div>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(v.version_number)}
              className="text-red-600 text-xs disabled:opacity-50"
            >
              Excluir v{v.version_number}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
