'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Tenant } from '@/types/tenant';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Loader2, ShieldAlert, Key, 
  CheckCircle2, Eye, EyeOff, Copy, Trash2, 
  Globe, LayoutGrid, CreditCard, AlertTriangle 
} from 'lucide-react';
import { useState } from 'react';

export default function TenantDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // UI States
  const [showApiKey, setShowApiKey] = useState(false);
  const [isHardDelete, setIsHardDelete] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantService.getById(id),
  });

  const { register, handleSubmit } = useForm<Partial<Tenant>>();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      setSuccessMsg('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tenantService.delete(id, isHardDelete),
    onSuccess: () => {
      router.push('/tenants');
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

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Link href="/tenants" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft size={20} />
          Voltar para listagem
        </Link>

        {successMsg && (
          <div className="fixed top-8 right-8 z-50 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 size={20} />
            {successMsg}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{tenant.nome_negocio}</h1>
            <p className="text-slate-500">ID: {tenant.id}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 ${tenant.is_blocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {tenant.is_blocked ? 'CONTA BLOQUEADA' : 'CONTA ATIVA'}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* Informações Básicas */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Globe size={18} /> Dados Institucionais
                  </h2>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Nome do Negócio</label>
                      <input 
                        {...register('nome_negocio')}
                        defaultValue={tenant.nome_negocio}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Documento (CPF/CNPJ)</label>
                      <input 
                        {...register('documento')}
                        defaultValue={tenant.documento}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Nicho de Atuação</label>
                      <input 
                        {...register('nicho')}
                        defaultValue={tenant.nicho}
                        placeholder="Ex: MEDICINA, VENDAS..."
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">URL do Site</label>
                      <input 
                        {...register('site_url')}
                        defaultValue={tenant.site_url}
                        placeholder="https://suaempresa.com"
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <LayoutGrid size={18} /> Serviços e Integrações
                  </h2>
                </div>
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Google Ads Customer ID</label>
                      <input 
                        {...register('google_ads_customer_id')}
                        defaultValue={tenant.google_ads_customer_id}
                        placeholder="000-000-0000"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-8">
                      <input 
                        type="checkbox"
                        {...register('use_mcc_auth')}
                        defaultChecked={tenant.use_mcc_auth}
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
                    <div className="flex flex-wrap gap-4">
                      {['crm', 'ads', 'site', 'notifications'].map((svc) => (
                        <label key={svc} className="flex items-center gap-2 px-4 py-2 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox"
                            value={svc}
                            defaultChecked={tenant.enabled_services?.includes(svc)}
                            {...register('enabled_services')}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-600 uppercase">{svc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Credentials */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
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
            </div>

            <div className="space-y-8 sticky top-8 h-fit">
              {/* Salvar Botão Fixo/Lateral */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {updateMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar Alterações
                </button>
                
                <hr className="my-6 border-slate-100" />

                {/* Info de Assinatura */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard size={18} /> Assinatura
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Plano</label>
                      <select {...register('plan_id')} defaultValue={tenant.plan_id} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium">
                        <option value="lp_flash">LP Flash</option>
                        <option value="lp_basico">LP Básico</option>
                        <option value="lp_intermediario">LP Intermediário</option>
                        <option value="lp_avancado">LP Avançado</option>
                        <option value="lp_personalizado">LP Personalizado</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                      <select {...register('plan_status')} defaultValue={tenant.plan_status} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium">
                        <option value="ativo">Ativo</option>
                        <option value="em_atraso">Em Atraso</option>
                        <option value="pausado">Pausado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Valor do Ciclo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                        <input 
                          {...register('plan_value', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          defaultValue={tenant.plan_value}
                          className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>

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

              {/* Área Crítica */}
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6 space-y-6">
                <h2 className="flex items-center gap-2 font-bold text-red-800">
                  <ShieldAlert size={20} /> Área de Perigo
                </h2>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => resetPwdMutation.mutate()}
                    disabled={resetPwdMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-red-700 bg-white font-medium hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <Key size={18} /> Resetar Senha Admin
                  </button>

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
              </div>
            </div>
          </div>
        </form>
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
    </div>
  );
}
