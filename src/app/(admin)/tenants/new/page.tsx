'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { planService } from '@/services/planService';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { CreateTenantInput } from '@/types/tenant';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { CurrencyInputBR } from '@/components/forms/CurrencyInputBR';

export default function NewTenantPage() {
  const router = useRouter();

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const plans = await planService.listPlans();
      return plans as any;
    },
  });

  const { register, handleSubmit, formState: { errors }, control, setValue } = useForm<CreateTenantInput>({
    defaultValues: {
      plan_id: 'lp_basico',
      plan_cycle: 'mensal',
      activation_fee: 0,
      monthly_value: 0
    }
  });

  const selectedPlanId = useWatch({ control, name: 'plan_id' });

  // Derive plan_type
  let planType: 'livre' | 'personalizado' | 'pago' = 'pago';
  if (selectedPlanId === 'livre') planType = 'livre';
  else if (selectedPlanId === 'personalizado') planType = 'personalizado';

  // Enforce read-only values for pre-configured plans
  useEffect(() => {
    if (planType === 'pago') {
      // Valores sempre vêm do plano configurado (somente-leitura). Sem fallback
      // fabricado: se o plano ainda não carregou, mantém o que já está no form.
      const activePlans = (plansData?.active as any[]) ?? [];
      const plan = activePlans.find((p: any) => p.slug === selectedPlanId);
      if (plan) {
        setValue('activation_fee', plan.activation_fee ?? 0);
        setValue('monthly_value', plan.monthly_value ?? 0);
        setValue('enabled_services', plan.included_services ?? []);
      }
    } else if (planType === 'livre') {
      setValue('activation_fee', 0);
      setValue('monthly_value', 0);
    }
  }, [selectedPlanId, planType, plansData, setValue]);

  const mutation = useMutation({
    mutationFn: tenantService.create,
    onSuccess: () => {
      router.push('/tenants');
    },
  });

  const onSubmit = (data: CreateTenantInput) => {
    const payload = {
      ...data,
      plan_type: planType,
      temporary_password: data.temporary_password || 'Unum@123456',
    };
    mutation.mutate(payload);
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
            {/* Seção 1: Dados do Negócio */}
            <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-lg font-bold text-slate-800">Dados do Negócio</h2>
                <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-2.5 py-0.5 rounded">Negócio</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nome do Negócio</label>
                  <input 
                    {...register('nome_negocio', { required: 'Campo obrigatório' })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="Ex: Unum Solutions"
                  />
                  {errors.nome_negocio && <span className="text-red-500 text-xs">{errors.nome_negocio.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">CPF / CNPJ</label>
                  <input 
                    {...register('documento', { 
                      required: planType !== 'livre' ? 'CPF/CNPJ é obrigatório para planos pagos' : false 
                    })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="000.000.000-00"
                  />
                  {errors.documento && <span className="text-red-500 text-xs">{errors.documento.message}</span>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nicho / Mercado</label>
                  <input 
                    {...register('nicho', { required: 'Campo obrigatório' })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="Ex: Tecnologia, Varejo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">URL do Site</label>
                  <input 
                    {...register('site_url')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="https://meusite.com.br"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Slug do Tenant</label>
                  <input 
                    {...register('slug')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="Ex: clinica-dra-ana (opcional)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Google Ads Customer ID</label>
                  <input 
                    {...register('google_ads_customer_id')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
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
            </div>

            {/* Seção 2: Administrador do Tenant */}
            <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-lg font-bold text-slate-800">Administrador do Tenant</h2>
                <div className="flex gap-2">
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Administrador</span>
                  <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">Administrador Inicial / TenantAdmin</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nome do Administrador</label>
                  <input 
                    {...register('nome_admin', { required: 'Campo obrigatório' })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">E-mail de Contato</label>
                  <input 
                    {...register('email_contato', { required: 'Campo obrigatório' })}
                    type="email"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="contato@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="temporary_password" className="text-sm font-semibold text-slate-700">Senha Temporária</label>
                  <input 
                    id="temporary_password"
                    type="password"
                    {...register('temporary_password')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white"
                    placeholder="Unum@123456"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="bg-slate-50 p-6 rounded-lg space-y-4">
              <h2 className="font-bold text-slate-900">Serviços Habilitados</h2>
              {planType === 'pago' && (
                <p className="text-xs text-slate-400 italic">Definidos pelo plano selecionado — mude o plano para alterar.</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['crm', 'site', 'blog', 'lp', 'ads', 'notifications'].map((service) => (
                  <label key={service} className={`flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg transition-colors ${planType === 'pago' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500'}`}>
                    <input
                      type="checkbox"
                      value={service}
                      disabled={planType === 'pago'}
                      {...register('enabled_services')}
                      className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {service === 'lp' ? 'Landing Pages' : service === 'crm' ? 'CRM' : service}
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
                  <label htmlFor="plan_id" className="text-sm font-semibold text-slate-700">Plano</label>
                  <select 
                    id="plan_id"
                    {...register('plan_id')}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="livre">Livre</option>
                    <option value="personalizado">Personalizado</option>
                    {plansData?.active?.map((plan: any) => (
                      <option key={plan.slug} value={plan.slug}>{plan.nome}</option>
                    ))}
                  </select>
                </div>

                {planType !== 'livre' && (
                  <>
                    <div className="md:col-span-2 pt-4 border-t border-slate-200 mt-2 mb-2">
                      <h3 className="text-lg font-bold text-slate-800">Métodos de Pagamento</h3>
                      <p className="text-sm text-slate-500">Selecione os métodos aceitos para este tenant (via Asaas).</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="activation_billing_type" className="text-sm font-semibold text-slate-700">Método de Pagamento da Ativação</label>
                      <select
                        id="activation_billing_type"
                        {...register('activation_billing_type')}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="pix">PIX</option>
                        <option value="credit_card">Cartão de Crédito</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subscription_billing_type" className="text-sm font-semibold text-slate-700">Método de Pagamento da Assinatura</label>
                      <select
                        id="subscription_billing_type"
                        {...register('subscription_billing_type')}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="pix">PIX</option>
                        <option value="credit_card">Cartão de Crédito</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="plan_cycle" className="text-sm font-semibold text-slate-700">Ciclo</label>
                      <select 
                        id="plan_cycle"
                        {...register('plan_cycle')}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="mensal">Mensal</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="activation_fee" className="text-sm font-semibold text-slate-700">Valor de Ativação</label>
                      <Controller
                        name="activation_fee"
                        control={control}
                        render={({ field }) => (
                          <CurrencyInputBR
                            id="activation_fee"
                            name={field.name}
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            readOnly={planType === 'pago'}
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="monthly_value" className="text-sm font-semibold text-slate-700">Mensalidade</label>
                      <Controller
                        name="monthly_value"
                        control={control}
                        render={({ field }) => (
                          <CurrencyInputBR
                            id="monthly_value"
                            name={field.name}
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            readOnly={planType === 'pago'}
                          />
                        )}
                      />
                    </div>
                  </>
                )}
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
