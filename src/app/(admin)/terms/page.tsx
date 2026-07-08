"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { termService } from '@/services/termService';
import { Term, CreateTermInput } from '@/types/term';
import * as Dialog from '@radix-ui/react-dialog';

export default function TermsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: termService.list,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const defaultValues: CreateTermInput = { name: '', description: '' };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTermInput>({ defaultValues });

  const createMutation = useMutation({
    mutationFn: (input: CreateTermInput) => termService.create(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      setIsDrawerOpen(false);
      reset(defaultValues);
      // Leva direto para a tela de edição — o próximo passo natural depois
      // de criar o termo é publicar a primeira versão do conteúdo.
      router.push(`/terms/${created.id}`);
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Falha ao criar o termo. Tente novamente.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => termService.remove(id),
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        setDeleteError('Não é possível excluir um termo com aceites registrados ou em uso por um plano ativo.');
      } else {
        setDeleteError('Falha ao excluir o termo. Tente novamente.');
      }
    },
  });

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setFormError(null);
      reset(defaultValues);
    }
  };

  const openCreateDrawer = () => {
    setFormError(null);
    reset(defaultValues);
    setIsDrawerOpen(true);
  };

  const onSubmit = (values: CreateTermInput) => {
    setFormError(null);
    createMutation.mutate(values);
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
          <Link
            href={`/terms/${term.id}`}
            className="px-4 py-2 border rounded hover:bg-slate-50"
          >
            Abrir {term.name}
          </Link>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              setDeleteError(null);
              deleteMutation.mutate(term.id);
            }}
            className="px-4 py-2 bg-secondary-600 text-white rounded disabled:opacity-50"
          >
            Excluir {term.name}
          </button>
        </div>
      </div>
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
                <h2 className="text-xl font-bold mb-4">Criar Novo Termo</h2>
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
                {formError && (
                  <p role="alert" className="text-red-600 text-sm">{formError}</p>
                )}
                <div className="mt-8 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 border rounded">Cancelar</button>
                  </Dialog.Close>
                  <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50">
                    {createMutation.isPending ? 'Salvando...' : 'Salvar Termo'}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {deleteError && (
        <p role="alert" className="mb-4 text-red-600 text-sm">{deleteError}</p>
      )}

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
    </div>
  );
}
