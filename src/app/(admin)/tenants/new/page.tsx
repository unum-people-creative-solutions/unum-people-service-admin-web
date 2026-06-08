'use client';

import { useMutation } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { CreateTenantInput } from '@/types/tenant';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function NewTenantPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTenantInput>({
    defaultValues: {
      plan_id: 'lp_basico',
      plan_cycle: 'mensal',
      plan_value: 199.90
    }
  });

  const mutation = useMutation({
    mutationFn: tenantService.create,
    onSuccess: () => {
      router.push('/tenants');
    },
  });

  const onSubmit = (data: CreateTenantInput) => {
    mutation.mutate(data);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <Link href="/tenants" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={20} />
          Voltar para listagem
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Cadastrar Novo Tenant</h1>
          <p className="text-slate-500 mb-8">Preencha os dados do parceiro e as configurações de assinatura.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nome do Negócio</label>
                <input 
                  {...register('nome_negocio', { required: 'Campo obrigatório' })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Ex: Unum Solutions"
                />
                {errors.nome_negocio && <span className="text-red-500 text-xs">{errors.nome_negocio.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">E-mail de Contato</label>
                <input 
                  {...register('email_contato', { required: 'Campo obrigatório' })}
                  type="email"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nome do Administrador</label>
                <input 
                  {...register('nome_admin', { required: 'Campo obrigatório' })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">CPF / CNPJ</label>
                <input 
                  {...register('documento', { required: 'Campo obrigatório' })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nicho / Mercado</label>
                <input 
                  {...register('nicho', { required: 'Campo obrigatório' })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Ex: Tecnologia, Varejo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">URL do Site</label>
                <input 
                  {...register('site_url')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="https://meusite.com.br"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Google Ads Customer ID</label>
                <input 
                  {...register('google_ads_customer_id')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  placeholder="000-000-0000"
                />
              </div>

              <div className="space-y-2 flex flex-col justify-center">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mt-6 cursor-pointer">
                  <input 
                    type="checkbox"
                    {...register('use_mcc_auth')}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <span>Utilizar Autenticação MCC (Gerenciador de Contas)</span>
                </label>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="bg-slate-50 p-6 rounded-lg space-y-4">
              <h2 className="font-bold text-slate-900">Serviços Habilitados</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['crm', 'site', 'blog', 'lp'].map((service) => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer p-3 bg-white border border-slate-200 rounded-lg hover:border-primary-500 transition-colors">
                    <input 
                      type="checkbox"
                      value={service}
                      {...register('enabled_services')}
                      className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {service === 'lp' ? 'Landing Pages' : service}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="bg-slate-50 p-6 rounded-lg space-y-4">
              <h2 className="font-bold text-slate-900">Configuração do Plano</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Plano</label>
                  <select 
                    {...register('plan_id')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="lp_flash">LP Flash</option>
                    <option value="lp_basico">LP Básico</option>
                    <option value="lp_intermediario">LP Intermediário</option>
                    <option value="lp_avancado">LP Avançado</option>
                    <option value="lp_personalizado">LP Personalizado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Ciclo</label>
                  <select 
                    {...register('plan_cycle')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Valor (R$)</label>
                  <input 
                    {...register('plan_value', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                disabled={mutation.isPending}
                type="submit"
                className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {mutation.isPending ? 'Salvando...' : 'Criar Tenant'}
              </button>
            </div>
            {mutation.isError && <p className="text-red-500 text-sm mt-2 text-center">Erro: {mutation.error.message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
