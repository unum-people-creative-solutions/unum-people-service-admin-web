"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import * as Dialog from '@radix-ui/react-dialog';
import { termService } from '@/services/termService';
import { Term, PublishTermVersionInput } from '@/types/term';

interface PublishVersionDrawerProps {
  term: Term;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishVersionDrawer({ term, open, onOpenChange }: PublishVersionDrawerProps) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<PublishTermVersionInput>({
    defaultValues: { content_md: '', changelog: '' },
  });

  const contentMD = watch('content_md');

  const publishMutation = useMutation({
    mutationFn: (input: PublishTermVersionInput) => termService.publishVersion(term.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['term-versions', term.id] });
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      reset({ content_md: '', changelog: '' });
      setFormError(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Falha ao publicar a versão. Tente novamente.');
    },
  });

  const onSubmit = (values: PublishTermVersionInput) => {
    setFormError(null);
    publishMutation.mutate(values);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-[480px] bg-white p-6 shadow-xl overflow-y-auto" role="dialog">
          <Dialog.Title asChild>
            <h2 className="text-xl font-bold mb-4">Publicar nova versão — {term.name}</h2>
          </Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="content_md" className="block text-sm font-semibold mb-1">Conteúdo (Markdown)</label>
              <textarea
                id="content_md"
                {...register('content_md', { required: true })}
                rows={10}
                className="w-full border p-2 rounded font-mono text-sm"
                placeholder="# Termo de Contratação..."
              />
            </div>
            <div>
              <label htmlFor="changelog" className="block text-sm font-semibold mb-1">Changelog</label>
              <input id="changelog" {...register('changelog')} className="w-full border p-2 rounded" placeholder="O que mudou nesta versão (opcional)" />
            </div>
            <button type="button" onClick={() => setShowPreview((p) => !p)} className="text-xs text-primary-600 underline">
              {showPreview ? 'Ocultar pré-visualização' : 'Pré-visualizar Markdown'}
            </button>
            {showPreview && (
              <pre className="border p-2 rounded bg-slate-50 text-xs whitespace-pre-wrap">{contentMD}</pre>
            )}
            {formError && (
              <p role="alert" className="text-red-600 text-sm">{formError}</p>
            )}
            <div className="mt-8 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 border rounded">Cancelar</button>
              </Dialog.Close>
              <button type="submit" disabled={publishMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50">
                {publishMutation.isPending ? 'Publicando...' : 'Publicar versão'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
