'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { planService } from '@/services/planService';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { Tenant, ChangePlanInput } from '@/types/tenant';
import Link from 'next/link';
import { PlanConfigFields } from '@/components/tenants/PlanConfigFields';
import { 
  ArrowLeft, Save, Loader2, ShieldAlert, Key,
  CheckCircle2, Eye, EyeOff, Copy, Trash2, 
  Globe, LayoutGrid, CreditCard, AlertTriangle 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { TenantUsersSection } from '@/components/TenantUsersSection';
import { BillingCard } from '@/components/tenants/BillingCard';

const getStatusBadge = (tenant: Tenant & { delinquency_since?: string | null }) => {
  if (tenant.is_blocked) {
    return { label: 'BLOQUEADA', classes: 'bg-red-50 text-red-700 border-red-200' };
  }

  const getDaysText = () => {
    if (!tenant.delinquency_since) return '';
    try {
      const start = new Date(tenant.delinquency_since);
      const now = new Date();
      start.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? ` (há ${diffDays} dias)` : '';
    } catch (e) {
      return '';
    }
  };

  switch (tenant.status) {
    case 'aguardando_ativacao':
      return { label: 'AGUARDANDO ATIVAÇÃO', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    case 'pendente_asaas':
      return { label: 'PENDENTE ASAAS', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ativo':
      return { label: 'ATIVO', classes: 'bg-green-50 text-green-700 border-green-200' };
    case 'inadimplente':
      return { label: `INADIMPLENTE${getDaysText()}`, classes: 'bg-red-50 text-red-700 border-red-200' };
    case 'suspenso':
      return { label: `SUSPENSO${getDaysText()}`, classes: 'bg-orange-50 text-orange-700 border-orange-200' };
    case 'pausado':
      return { label: `PAUSADO${getDaysText()}`, classes: 'bg-slate-50 text-slate-700 border-slate-200' };
    case 'cancelado':
      return { label: 'CANCELADO', classes: 'bg-slate-100 text-slate-800 border-slate-300' };
    default:
      return { label: tenant.status ? String(tenant.status).toUpperCase() : 'DESCONHECIDO', classes: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
};

export default function TenantDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // UI States
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [isHardDelete, setIsHardDelete] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [pendingPlanData, setPendingPlanData] = useState<Partial<Tenant> | null>(null);

  const methods = useForm<Partial<Tenant>>();
  const { register, handleSubmit, reset, setValue, control, formState: { dirtyFields, isDirty } } = methods;
  const selectedPlanId = useWatch({ control, name: 'plan_id' }) || '';

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantService.getById(id),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const data = await planService.listPlans();
      return data as any;
    },
  });

  // Sincroniza dados e evita discrepância entre null e "" para o estado 'dirty'
  useEffect(() => {
    if (tenant) {
      const sanitizedTenant = {
        ...tenant,
        nome_negocio: tenant.nome_negocio || '',
        documento: tenant.documento || '',
        nicho: tenant.nicho || '',
        site_url: tenant.site_url || '',
        slug: tenant.slug || '',
        google_ads_customer_id: tenant.google_ads_customer_id || '',
        enabled_services: tenant.enabled_services || [],
        activation_fee: tenant.contract?.activation_fee ?? 0,
        monthly_value: tenant.contract?.monthly_value ?? tenant.plan_value ?? 0,
        activation_billing_type: tenant.contract?.activation_billing_type ?? 'pix',
        subscription_billing_type: tenant.contract?.subscription_billing_type ?? 'pix',
      };
      reset(sanitizedTenant);
    }
  }, [tenant, reset]);

  // O <select> de plano é não-controlado: quando o plansData chega depois do
  // tenant, a option de fallback (renderizada antes da lista carregar) é
  // substituída pela option "real" dentro do <optgroup> — mesmo value, posição
  // diferente no DOM. Essa troca de elementos faz o <select> nativo perder a
  // seleção e voltar para a 1ª option ("Livre"). Reaplicamos o valor depois que
  // a lista de planos chega para corrigir a seleção visual.
  useEffect(() => {
    if (tenant && plansData) {
      setValue('plan_id', tenant.plan_id, { shouldDirty: false });
    }
  }, [plansData, tenant, setValue]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      setSuccessMsg('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Erro ao atualizar os dados do tenant.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const changePlanMutation = useMutation({
    mutationFn: (input: ChangePlanInput) => tenantService.changePlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      setSuccessMsg('Plano alterado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowChangePlanModal(false);
      setPendingPlanData(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Erro ao alterar o plano. Tente novamente.');
      setTimeout(() => setErrorMsg(null), 5000);
      setShowChangePlanModal(false);
      setPendingPlanData(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => tenantService.delete(id, isHardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      router.push('/tenants');
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

  // Planos pré-configurados (qualquer slug que não seja livre/personalizado) têm
  // os serviços definidos pelo plano (RF-28); só Livre/Personalizado permanecem
  // editáveis manualmente pelo operador.
  const isPlanoPreConfigurado = selectedPlanId !== 'livre' && selectedPlanId !== 'personalizado' && selectedPlanId !== '';

  const onSubmit = (data: Partial<Tenant>) => {
    const dirtyData = Object.keys(dirtyFields).reduce((acc, key) => {
      acc[key as keyof Tenant] = data[key as keyof Tenant];
      return acc;
    }, {} as any);
    
    // As requested by test, always send plan_id to ensure it's preserved explicitly
    if (data.plan_id) {
      dirtyData.plan_id = data.plan_id;
    }

    if (dirtyFields.plan_id && data.plan_id !== tenant.plan_id) {
      setPendingPlanData(dirtyData);
      setShowChangePlanModal(true);
    } else {
      delete dirtyData.plan_cycle;
      updateMutation.mutate(dirtyData);
    }
  };

  const confirmChangePlan = async () => {
    if (pendingPlanData && pendingPlanData.plan_id) {
      try {
        const selectedPlanId = pendingPlanData.plan_id;
        const selectedPlan = plansData?.find((p: any) => p.slug === selectedPlanId);
        
        const isLivre = selectedPlanId === 'livre';
        const isPersonalizado = selectedPlanId === 'personalizado';
        const planType = isLivre ? 'livre' : (isPersonalizado ? 'personalizado' : 'pago');

        const payload: ChangePlanInput = {
          plan_id: selectedPlanId,
          plan_type: planType,
          monthly_value: (pendingPlanData.plan_value !== undefined && pendingPlanData.plan_value !== null && String(pendingPlanData.plan_value).trim() !== '') 
            ? Number(pendingPlanData.plan_value) 
            : (selectedPlan?.monthly_value ?? 0),
          activation_fee: ((pendingPlanData as any).activation_fee !== undefined && (pendingPlanData as any).activation_fee !== null && String((pendingPlanData as any).activation_fee).trim() !== '')
            ? Number((pendingPlanData as any).activation_fee)
            : (selectedPlan?.activation_fee ?? 0),
          activation_billing_type: tenant?.contract?.activation_billing_type || 'pix',
          subscription_billing_type: tenant?.contract?.subscription_billing_type || 'pix',
          plan_cycle: pendingPlanData.plan_cycle ?? selectedPlan?.cycle ?? 'mensal',
          enabled_services: isLivre || isPersonalizado 
            ? (pendingPlanData.enabled_services || tenant?.enabled_services || []) 
            : (selectedPlan?.included_services || []),
        };

        await changePlanMutation.mutateAsync(payload);
        
        const otherData = { ...pendingPlanData };
        delete otherData.plan_id;
        delete otherData.plan_value;
        delete otherData.plan_cycle;
        if (Object.keys(otherData).length > 0) {
          await updateMutation.mutateAsync(otherData);
        }
      } catch (e) {
        // Error already handled by onError of the mutations
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg('API Key copiada!');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleDelete = () => {
    if (deleteConfirmText === 'excluir tenant') {
      deleteMutation.mutate();
    }
  };

  // Verificações rigorosas de estado 'dirty' por seção
  const isBasicsDirty = ['nome_negocio', 'documento', 'nicho', 'site_url', 'slug'].some(
    field => dirtyFields[field as keyof Tenant] === true
  );
  
  const isIntegrationsDirty = (
    dirtyFields.google_ads_customer_id === true || 
    dirtyFields.use_mcc_auth === true || 
    (Array.isArray(dirtyFields.enabled_services) && dirtyFields.enabled_services.some(v => v === true))
  );
  
  const isSubscriptionDirty = ['plan_id', 'plan_value'].some(
    field => dirtyFields[field as keyof Tenant] === true
  );

  const StatusLed = ({ active }: { active: boolean }) => {
    const label = active ? 'Alterações Pendentes' : 'Sincronizado';
    return (
      <div 
        className={`group relative flex items-center justify-center h-6 w-6 border rounded-full transition-all duration-300 ${active ? 'bg-red-50 border-red-200 animate-pulse shadow-sm shadow-red-200' : 'bg-green-50 border-green-200'}`}
      >
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-red-500' : 'bg-green-500'}`} />
        
        {/* Tooltip posicionada para a esquerda para evitar corte pelo overflow-hidden do card */}
        <div className="absolute right-full mr-2 hidden group-hover:block whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl z-20">
          {label}
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Link href="/tenants" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={20} />
          Voltar para listagem
        </Link>

        {successMsg && (
          <div className="fixed top-8 right-8 z-[110] p-4 bg-white border-l-4 border-green-500 text-slate-800 shadow-2xl rounded-r-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 size={20} className="text-green-500" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="fixed top-24 right-8 z-[110] p-4 bg-white border-l-4 border-red-500 text-slate-800 shadow-2xl rounded-r-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
            <ShieldAlert size={20} className="text-red-500" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-900">{tenant.nome_negocio}</h1>
                {(() => {
                  const badge = getStatusBadge(tenant);
                  return (
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${badge.classes}`}>
                      {badge.label}
                    </div>
                  );
                })()}
              </div>
              <p className="text-slate-500 text-sm">Tenant ID: <span className="font-mono">{tenant.id}</span></p>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                type="submit"
                disabled={updateMutation.isPending || !isDirty}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:grayscale ${isDirty ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/20' : 'bg-slate-200 text-slate-400'}`}
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Salvar Alterações
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* Informações Básicas */}
              <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${isBasicsDirty ? 'border-red-200 shadow-red-500/5' : 'border-slate-200'}`}>
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Globe size={18} /> Dados Institucionais
                  </h2>
                  <StatusLed active={isBasicsDirty} />
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Nome do Negócio</label>
                      <input 
                        {...register('nome_negocio')}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Nicho de Atuação</label>
                      <input 
                        {...register('nicho')}
                        placeholder="Ex: MEDICINA, VENDAS..."
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">URL do Site</label>
                      <input 
                        {...register('site_url')}
                        placeholder="https://suaempresa.com"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Slug do Tenant</label>
                      <input 
                        {...register('slug')}
                        placeholder="Ex: clinica-dra-ana"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">E-mail do Proprietário (Login)</label>
                    <input 
                      disabled
                      value={tenant.email_contato}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed italic"
                    />
                    <p className="text-[10px] text-slate-400">O e-mail é a chave de identidade e não pode ser alterado após o cadastro.</p>
                  </div>
                </div>
              </div>

              {/* Integrações e Serviços */}
              <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${isIntegrationsDirty ? 'border-red-200 shadow-red-500/5' : 'border-slate-200'}`}>
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid size={18} /> Serviços e Integrações
                  </h2>
                  <StatusLed active={isIntegrationsDirty} />
                </div>
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Google Ads Customer ID</label>
                      <input 
                        {...register('google_ads_customer_id')}
                        placeholder="000-000-0000"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-8">
                      <input 
                        type="checkbox"
                        {...register('use_mcc_auth')}
                        id="use_mcc_auth"
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <label htmlFor="use_mcc_auth" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Utilizar Autenticação MCC (Master)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-700">Serviços Ativos</label>
                    {isPlanoPreConfigurado && (
                      <p className="text-xs text-slate-400 italic">Definidos pelo plano selecionado — mude o plano para alterar.</p>
                    )}
                    <div className="flex flex-wrap gap-4">
                      {['crm', 'site', 'blog', 'lp', 'ads', 'notifications'].map((svc) => (
                        <label key={svc} className={`flex items-center gap-2 px-4 py-2 border border-slate-100 rounded-lg transition-colors ${isPlanoPreConfigurado ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50 cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            value={svc}
                            disabled={isPlanoPreConfigurado}
                            {...register('enabled_services')}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-600 uppercase">
                            {svc === 'lp' ? 'Landing Pages' : svc === 'crm' ? 'CRM' : svc}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Credentials */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Key size={18} /> Chaves de API
                  </h2>
                </div>
                <div className="p-8">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">X-API-Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          readOnly
                          type={showApiKey ? 'text' : 'password'}
                          value={showApiKey ? tenant.api_key : 'up_••••••••••••••••••••••••'}
                          className="w-full pl-4 pr-12 py-3 bg-slate-900 text-slate-100 font-mono text-sm rounded-lg border border-slate-800"
                        />
                        <button
                          type="button"
                          aria-label="revelar"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                        >
                          {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tenant.api_key)}
                        className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Copiar Chave"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Utilize esta chave para autenticar requisições na API de Ingestão de Leads.</p>
                  </div>
                </div>
              </div>

              {/* Seção de Usuários */}
              <TenantUsersSection tenantId={id} />
            </div>

            <div className="space-y-8 sticky top-8 h-fit">
              {/* Card de Billing (Asaas) — apenas para planos pagos/personalizado */}
              {tenant.plan_type !== 'livre' && (
                <BillingCard tenant={tenant} contract={tenant.contract} />
              )}

              {/* Card Assinatura */}
              <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${isSubscriptionDirty ? 'border-red-200 shadow-red-500/5' : 'border-slate-200'}`}>
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard size={18} /> Assinatura
                  </h2>
                  <StatusLed active={isSubscriptionDirty} />
                </div>
                
                <div className="p-8">
                  <PlanConfigFields plansData={plansData} currentPlanId={tenant?.plan_id} />

                  <div className="mt-8 space-y-3 pt-6 border-t border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 italic">Próximo Débito:</span>
                      <span className="font-bold text-primary-600 underline cursor-help" title={new Date(tenant.next_billing_at).toLocaleString()}>
                        {new Date(tenant.next_billing_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 italic">Renovação Contratual:</span>
                      <span className="font-bold text-slate-700">
                        {new Date(tenant.renewal_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Área Crítica */}
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold text-red-800">
                    <ShieldAlert size={20} /> Área de Perigo
                  </h2>
                  <button 
                    type="button"
                    onClick={() => setShowDangerZone(!showDangerZone)}
                    className="text-[10px] font-bold px-3 py-1 border border-red-200 rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors shadow-sm"
                  >
                    {showDangerZone ? 'OCULTAR AÇÕES' : 'MOSTRAR AÇÕES'}
                  </button>
                </div>

                {showDangerZone && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 bg-white/50 rounded-lg border border-red-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-red-900 block">Bloquear Tenant</span>
                        <p className="text-[10px] text-red-600 max-w-[120px]">Interrompe acesso imediato de todos os usuários.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBlockMutation.mutate(!tenant.is_blocked)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${tenant.is_blocked ? 'bg-red-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tenant.is_blocked ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-red-100 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            id="hard_delete_toggle"
                            className="sr-only peer" 
                            checked={isHardDelete}
                            onChange={(e) => setIsHardDelete(e.target.checked)}
                          />
                          <div className={`h-3 w-3 ml-1 rounded-full bg-white transition-all peer-checked:translate-x-4 ${isHardDelete ? 'bg-red-600' : ''}`}></div>
                          <label htmlFor="hard_delete_toggle" className="absolute inset-0 cursor-pointer">
                            <span className="sr-only">Hard Delete</span>
                          </label>
                        </div>
                        <span className="text-xs font-bold text-slate-700">MODO EXCLUSÃO FÍSICA</span>
                      </div>

                      {isHardDelete && (
                        <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-[10px] font-bold animate-pulse">
                          <AlertTriangle size={14} className="inline mr-1" />
                          Atenção: Deleção Física Ativada! Isto removerá permanentemente todos os registros do banco.
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all shadow-md active:scale-95"
                      >
                        <Trash2 size={18} />
                        Excluir Tenant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </form>
        </FormProvider>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-6 border-b flex items-center gap-3 ${isHardDelete ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold">
                {isHardDelete ? 'Confirmar Exclusão Física' : 'Confirmar Exclusão Lógica'}
              </h3>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-slate-600 text-sm leading-relaxed">
                {isHardDelete 
                  ? 'Você está prestes a realizar uma deleção física e IRREVERSÍVEL. O tenant será removido permanentemente do banco de dados, o usuário será deletado do Cognito e os leads serão anonimizados imediatamente.'
                  : 'O tenant será marcado para exclusão (Soft Delete). O acesso será bloqueado e os dados serão anonimizados conforme a política de privacidade, mantendo apenas logs de auditoria legal.'}
              </p>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Para confirmar, digite as palavras abaixo:
                </label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center font-mono font-bold text-slate-400 select-none">
                  excluir tenant
                </div>
                <input 
                  autoFocus
                  placeholder='Digite "excluir tenant"'
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-center font-bold"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={deleteConfirmText !== 'excluir tenant' || deleteMutation.isPending}
                  onClick={handleDelete}
                  className="flex-2 px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
                >
                  {deleteMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Change Plan Confirmation Modal */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex items-center gap-3 bg-amber-50 border-amber-100 text-amber-800">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold">Confirmar Troca de Plano</h3>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-slate-600 text-sm leading-relaxed">
                Você está prestes a alterar o plano deste tenant. Esta ação pode redefinir o ciclo de faturamento e serviços incluídos.
              </p>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePlanModal(false);
                    setPendingPlanData(null);
                  }}
                  disabled={changePlanMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={changePlanMutation.isPending || updateMutation.isPending}
                  onClick={confirmChangePlan}
                  className="flex-2 px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-500/30"
                >
                  {(changePlanMutation.isPending || updateMutation.isPending) ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar Troca'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
