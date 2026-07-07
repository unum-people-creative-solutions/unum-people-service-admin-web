"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { termService } from '@/services/termService';
import { Term, CreateTermInput, UpdateTermInput } from '@/types/term';
import * as Dialog from '@radix-ui/react-dialog';
import { VersionHistoryList } from './_components/VersionHistoryList';
import { PublishVersionDrawer } from './_components/PublishVersionDrawer';

type TermFormValues = CreateTermInput & { is_active: boolean };

export default function TermsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: termService.list,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [publishDrawerTerm, setPublishDrawerTerm] = useState<Term | null>(null);

  const defaultValues: TermFormValues = { name: '', description: '', is_active: true };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TermFormValues>({ defaultValues });

  const createMutation = useMutation({
    mutationFn: (input: CreateTermInput) => termService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setIsDrawerOpen(false);
      reset(defaultValues);
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Falha ao criar o termo. Tente novamente.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTermInput }) => termService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setIsDrawerOpen(false);
      setEditingTerm(null);
      reset(defaultValues);
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Falha ao salvar o termo. Tente novamente.');
    },
  });

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setEditingTerm(null);
      setFormError(null);
      reset(defaultValues);
    }
  };

  const openCreateDrawer = () => {
    setEditingTerm(null);
    setFormError(null);
    reset(defaultValues);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (term: Term) => {
    setEditingTerm(term);
    setFormError(null);
    reset({ name: term.name, description: term.description, is_active: term.is_active });
    setIsDrawerOpen(true);
  };

  const onSubmit = (values: TermFormValues) => {
    setFormError(null);
    if (editingTerm) {
      updateMutation.mutate({ id: editingTerm.id, input: values });
    } else {
      createMutation.mutate({ name: values.name, description: values.description });
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  const terms: Term[] = data ?? [];
  const activeTerms = terms.filter((t) => t.is_active);
  const inactiveTerms = terms.filter((t) => !t.is_active);

  const renderTermCard = (term: Term) => (
    <div key={term.id} className="border p-4 rounded-xl">
      <div className="flex justify-between items-center">
        <div>
          <h3>{term.name}</h3>
          <p className="text-xs text-slate-500">{term.description}</p>
          <p className="text-xs text-slate-400">Versão atual: v{term.current_version}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openEditDrawer(term)}
            className="px-4 py-2 border rounded hover:bg-slate-50"
          >
            Editar {term.name}
          </button>
          <button
            type="button"
            onClick={() => setPublishDrawerTerm(term)}
            className="px-4 py-2 border rounded hover:bg-slate-50"
          >
            Publicar nova versão
          </button>
          <button
            type="button"
            onClick={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}
            className="px-4 py-2 border rounded hover:bg-slate-50"
          >
            {expandedTermId === term.id ? 'Fechar versões' : 'Ver versões'}
          </button>
        </div>
      </div>
      {expandedTermId === term.id && <VersionHistoryList term={term} />}
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Termos de Contratação</h1>
        <Dialog.Root open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
          <button onClick={openCreateDrawer} className="bg-primary-600 text-white px-4 py-2 rounded-lg">Novo Termo</button>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed right-0 top-0 bottom-0 w-[400px] bg-white p-6 shadow-xl" role="dialog">
              <Dialog.Title asChild>
                <h2 className="text-xl font-bold mb-4">{editingTerm ? `Editar Termo — ${editingTerm.name}` : 'Criar Novo Termo'}</h2>
              </Dialog.Title>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold mb-1">Nome</label>
                  <input
                    id="name"
                    {...register('name', { required: true })}
                    className="w-full border p-2 rounded"
                    placeholder="ex: Termo Pacote Site"
                  />
                  {errors.name && <span className="text-red-500 text-xs">Obrigatório</span>}
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold mb-1">Descrição</label>
                  <textarea id="description" {...register('description')} className="w-full border p-2 rounded" placeholder="Descrição interna do termo" />
                </div>
                {editingTerm && (
                  <div className="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="is_active" {...register('is_active')} />
                    <label htmlFor="is_active" className="text-sm font-semibold">Ativo</label>
                  </div>
                )}
                {formError && (
                  <p role="alert" className="text-red-600 text-sm">{formError}</p>
                )}
                <div className="mt-8 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 border rounded">Cancelar</button>
                  </Dialog.Close>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50">
                    {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Termo'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Termos Ativos</h2>
        <div className="grid gap-4">
          {activeTerms.map(renderTermCard)}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Termos Desativados</h2>
        <div className="grid gap-4">
          {inactiveTerms.map(renderTermCard)}
        </div>
      </section>

      {publishDrawerTerm && (
        <PublishVersionDrawer
          term={publishDrawerTerm}
          open={!!publishDrawerTerm}
          onOpenChange={(open) => !open && setPublishDrawerTerm(null)}
        />
      )}
    </div>
  );
}
