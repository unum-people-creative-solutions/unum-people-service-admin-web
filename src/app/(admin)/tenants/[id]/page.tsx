'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Tenant, PlanID, PlanStatus, PlanCycle } from '@/types/tenant';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, ShieldAlert, Key, Ban, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function TenantDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantService.getById(id),
  });

  const { register, handleSubmit, reset } = useForm<Partial<Tenant>>();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      setSuccessMsg('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: () => tenantService.resetPassword(id),
    onSuccess: () => {
      alert('Fluxo de reset de senha disparado com sucesso!');
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: (is_blocked: boolean) => tenantService.update(id, { is_blocked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
    },
  });

  if (isLoading) return <div className="p-8 animate-pulse">Carregando detalhes...</div>;
  if (error || !tenant) return <div className="p-8 text-red-600">Erro: Tenant não encontrado.</div>;

  const onSubmit = (data: Partial<Tenant>) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Link href="/tenants" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={20} />
          Voltar para listagem
        </Link>

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={20} />
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Informações Principais */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{tenant.nome_negocio}</h1>
                  <p className="text-slate-500">ID: {tenant.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${tenant.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {tenant.is_blocked ? 'BLOQUEADO' : 'ATIVO'}
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Nome do Negócio</label>
                    <input 
                      {...register('nome_negocio')}
                      defaultValue={tenant.nome_negocio}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Documento (CPF/CNPJ)</label>
                    <input 
                      {...register('documento')}
                      defaultValue={tenant.documento}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">E-mail de Contato</label>
                    <input 
                      disabled
                      value={tenant.email_contato}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-4">
                  <h2 className="font-bold text-slate-900">Configuração de Assinatura</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Plano</label>
                      <select {...register('plan_id')} defaultValue={tenant.plan_id} className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                        <option value="lp_flash">LP Flash</option>
                        <option value="lp_basico">LP Básico</option>
                        <option value="lp_intermediario">LP Intermediário</option>
                        <option value="lp_avancado">LP Avançado</option>
                        <option value="lp_personalizado">LP Personalizado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Status do Plano</label>
                      <select {...register('plan_status')} defaultValue={tenant.plan_status} className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                        <option value="ativo">Ativo</option>
                        <option value="em_atraso">Em Atraso</option>
                        <option value="pausado">Pausado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Valor</label>
                      <input 
                        {...register('plan_value', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        defaultValue={tenant.plan_value}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-8">
            {/* Ações de Segurança */}
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
              <h2 className="flex items-center gap-2 font-bold text-red-700 mb-6">
                <ShieldAlert size={20} />
                Área Crítica
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => resetPwdMutation.mutate()}
                  disabled={resetPwdMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  <Key size={18} />
                  Resetar Senha do Dono
                </button>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">Bloquear Acesso</span>
                    <button
                      onClick={() => toggleBlockMutation.mutate(!tenant.is_blocked)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${tenant.is_blocked ? 'bg-red-600' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tenant.is_blocked ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ao bloquear, todas as sessões serão invalidadas e as APIs de ingestão retornarão 403 Forbidden.
                  </p>
                </div>
              </div>
            </div>

            {/* Informações de Ciclo */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Informações de Ciclo</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ativação:</span>
                  <span className="font-medium">{new Date(tenant.activated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Próximo Débito:</span>
                  <span className="font-medium text-primary-600">{new Date(tenant.next_billing_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Renovação:</span>
                  <span className="font-medium">{new Date(tenant.renewal_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
