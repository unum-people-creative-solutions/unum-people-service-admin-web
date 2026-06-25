"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { planService } from '@/services/planService';
import { Plan } from '@/types/tenant';
import * as Dialog from '@radix-ui/react-dialog';
import { CurrencyInputBR } from '@/components/forms/CurrencyInputBR';

export default function PlansPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: planService.listPlans,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const defaultPlanValues: Omit<Plan, 'tenant_count' | 'created_at' | 'updated_at'> = {
    slug: '',
    nome: '',
    descricao: '',
    activation_fee: 0,
    monthly_value: 0,
    included_services: [],
    is_active: true,
    cycle: 'mensal',
  };

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<Omit<Plan, 'tenant_count' | 'created_at' | 'updated_at'>>({
    defaultValues: defaultPlanValues,
  });

  const cycle = useWatch({ control, name: 'cycle' });
  const isAnual = cycle === 'anual';

  const createMutation = useMutation({
    mutationFn: (newPlan: Omit<Plan, 'tenant_count' | 'created_at' | 'updated_at'>) => planService.createPlan(newPlan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsDrawerOpen(false);
      reset(defaultPlanValues);
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Falha ao criar o plano. Tente novamente.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ slug, plan }: { slug: string; plan: Partial<Plan> }) => planService.updatePlan(slug, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsDrawerOpen(false);
      setEditingPlan(null);
      reset(defaultPlanValues);
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Falha ao salvar o plano. Tente novamente.');
    },
  });

  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setEditingPlan(null);
      setFormError(null);
      reset(defaultPlanValues);
    }
  };

  const openCreateDrawer = () => {
    setEditingPlan(null);
    setFormError(null);
    reset(defaultPlanValues);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (plan: Plan) => {
    setEditingPlan(plan);
    setFormError(null);
    reset({
      slug: plan.slug,
      nome: plan.nome,
      descricao: plan.descricao,
      activation_fee: plan.activation_fee,
      monthly_value: plan.monthly_value,
      included_services: plan.included_services,
      is_active: plan.is_active,
      cycle: plan.cycle,
    });
    setIsDrawerOpen(true);
  };

  const onSubmit = (data: Omit<Plan, 'tenant_count' | 'created_at' | 'updated_at'>) => {
    setFormError(null);
    const payload = {
      ...data,
      activation_fee: Number(data.activation_fee),
      monthly_value: Number(data.monthly_value),
    };
    if (payload.cycle === 'anual') {
      payload.monthly_value = 0;
    }
    if (typeof payload.included_services === 'string') {
      payload.included_services = (payload.included_services as string).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (editingPlan) {
      // Preserva created_at original: o backend não o gera de novo no Update,
      // só sobrescreve updated_at (plan_service.go:42).
      updateMutation.mutate({ slug: editingPlan.slug, plan: { ...payload, created_at: editingPlan.created_at } });
    } else {
      createMutation.mutate(payload);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => planService.deletePlan(slug),
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        setDeleteError('Não é possível excluir um plano com tenants vinculados.');
      } else {
        setDeleteError('Falha ao excluir o plano. Tente novamente.');
      }
    },
  });

  if (isLoading) return <div>Carregando...</div>;

  const activePlans: Plan[] = data?.active ?? [];
  const inactivePlans: Plan[] = data?.inactive ?? [];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Planos</h1>
        <Dialog.Root open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
          <button onClick={openCreateDrawer} className="bg-primary-600 text-white px-4 py-2 rounded-lg">Novo Plano</button>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed right-0 top-0 bottom-0 w-[400px] bg-white p-6 shadow-xl" role="dialog">
              <Dialog.Title asChild>
                <h2 className="text-xl font-bold mb-4">{editingPlan ? `Editar Plano — ${editingPlan.nome}` : 'Criar Novo Plano'}</h2>
              </Dialog.Title>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Slug do Plano</label>
                  <input
                    {...register('slug', { required: true })}
                    readOnly={!!editingPlan}
                    className="w-full border p-2 rounded read-only:bg-slate-100 read-only:text-slate-500"
                    placeholder="ex: basico_mensal"
                  />
                  {errors.slug && <span className="text-red-500 text-xs">Obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Nome</label>
                  <input {...register('nome', { required: true })} className="w-full border p-2 rounded" placeholder="ex: Básico Mensal" />
                  {errors.nome && <span className="text-red-500 text-xs">Obrigatório</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Descrição</label>
                  <textarea {...register('descricao')} className="w-full border p-2 rounded" placeholder="Descrição comercial" />
                </div>
                <div>
                  <label htmlFor="cycle" className="block text-sm font-semibold mb-1">Ciclo</label>
                  <select id="cycle" {...register('cycle')} className="w-full border p-2 rounded">
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label htmlFor="activation_fee" className="block text-sm font-semibold mb-1">{isAnual ? 'Valor Anual' : 'Taxa de Adesão'}</label>
                    <Controller
                      name="activation_fee"
                      control={control}
                      rules={{ validate: (v) => v > 0 || 'Obrigatório' }}
                      render={({ field }) => (
                        <CurrencyInputBR
                          id="activation_fee"
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          className="w-full pl-9 pr-4 py-2 border rounded"
                        />
                      )}
                    />
                    {errors.activation_fee && <span className="text-red-500 text-xs">Obrigatório</span>}
                  </div>
                  {!isAnual && (
                    <div className="flex-1">
                      <label htmlFor="monthly_value" className="block text-sm font-semibold mb-1">Mensalidade</label>
                      <Controller
                        name="monthly_value"
                        control={control}
                        rules={{ validate: (v) => v > 0 || 'Obrigatório' }}
                        render={({ field }) => (
                          <CurrencyInputBR
                            id="monthly_value"
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            className="w-full pl-9 pr-4 py-2 border rounded"
                          />
                        )}
                      />
                      {errors.monthly_value && <span className="text-red-500 text-xs">Obrigatório</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Serviços Inclusos (vírgula)</label>
                  <input {...register('included_services')} className="w-full border p-2 rounded" placeholder="ex: crm, admin" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="is_active" {...register('is_active')} />
                  <label htmlFor="is_active" className="text-sm font-semibold">Ativo</label>
                </div>
                {formError && (
                  <p role="alert" className="text-red-600 text-sm">{formError}</p>
                )}
                <div className="mt-8 flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button type="button" className="px-4 py-2 border rounded">Cancelar</button>
                  </Dialog.Close>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50">
                    {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Plano'}
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
        <h2 className="text-xl font-bold mb-4">Planos Ativos</h2>
        <div className="grid gap-4">
          {activePlans.map((plan) => (
            <div key={plan.slug} className="border p-4 rounded-xl flex justify-between items-center">
              <div>
                <h3>{plan.nome}</h3>
                <p className="text-xs text-slate-500">
                  Taxa de ativação: R$ {(plan.activation_fee ?? 0).toLocaleString('pt-BR')} · Mensalidade: R$ {(plan.monthly_value ?? 0).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditDrawer(plan)}
                className="px-4 py-2 border rounded hover:bg-slate-50"
              >
                Editar {plan.nome}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Planos Desativados</h2>
        <div className="grid gap-4">
          {inactivePlans.map((plan) => {
            const linkedTenants = plan.tenant_count ?? 0;
            const canDelete = linkedTenants === 0;
            return (
              <div key={plan.slug} className="border p-4 rounded-xl flex justify-between items-center">
                <div>
                  <h3>{plan.nome}</h3>
                  <p className="text-xs text-slate-500">{linkedTenants} tenant(s) vinculado(s)</p>
                </div>
                <button
                  type="button"
                  disabled={!canDelete || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(plan.slug)}
                  className="bg-secondary-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Excluir {plan.nome}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
