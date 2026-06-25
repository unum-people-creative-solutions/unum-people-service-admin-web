import { useEffect } from 'react';
import { useFormContext, useWatch, Controller } from 'react-hook-form';
import { CurrencyInputBR } from '@/components/forms/CurrencyInputBR';

interface PlanConfigFieldsProps {
  plansData: {
    active: any[];
    inactive?: any[];
  };
  currentPlanId?: string;
}

export function PlanConfigFields({ plansData, currentPlanId }: PlanConfigFieldsProps) {
  const { register, control, setValue, formState } = useFormContext();
  const selectedPlanId = useWatch({ control, name: 'plan_id' });
  const selectedCycle = useWatch({ control, name: 'plan_cycle' });

  // Derive plan_type
  let planType: 'livre' | 'personalizado' | 'pago' = 'pago';
  if (selectedPlanId === 'livre') planType = 'livre';
  else if (selectedPlanId === 'personalizado') planType = 'personalizado';

  // Ciclo resultante: travado pelo plano para `pago`; livremente escolhido para `personalizado`.
  let resolvedCycle: 'mensal' | 'anual' = 'mensal';
  if (planType === 'pago') {
    const activePlans = plansData?.active ?? [];
    const plan = activePlans.find((p: any) => p.slug === selectedPlanId);
    resolvedCycle = plan?.cycle ?? 'mensal';
  } else if (planType === 'personalizado') {
    resolvedCycle = selectedCycle ?? 'mensal';
  }
  const isAnualCycle = resolvedCycle === 'anual';

  // Enforce read-only values for pre-configured plans
  useEffect(() => {
    const defaultPlanId = formState.defaultValues?.plan_id;
    const isPlanChanged = selectedPlanId !== defaultPlanId;

    if (planType === 'pago') {
      const activePlans = plansData?.active ?? [];
      const inactivePlans = plansData?.inactive ?? [];
      const allPlans = [...activePlans, ...inactivePlans];
      const plan = allPlans.find((p: any) => p.slug === selectedPlanId);
      if (plan) {
        setValue('activation_fee', plan.activation_fee ?? 0, { shouldDirty: isPlanChanged });
        setValue('monthly_value', plan.monthly_value ?? 0, { shouldDirty: isPlanChanged });
        setValue('enabled_services', plan.included_services ?? [], { shouldDirty: isPlanChanged });
      }
    } else if (planType === 'livre') {
      setValue('activation_fee', 0, { shouldDirty: isPlanChanged });
      setValue('monthly_value', 0, { shouldDirty: isPlanChanged });
    }
  }, [selectedPlanId, planType, plansData, setValue, formState.defaultValues?.plan_id]);

  // Ciclo é sempre derivado/travado a partir do plano para `pago` (RF-CY-04),
  // independente de o plano ter sido alterado nesta sessão ou já vir selecionado.
  useEffect(() => {
    if (planType !== 'pago') return;
    const activePlans = plansData?.active ?? [];
    const plan = activePlans.find((p: any) => p.slug === selectedPlanId);
    if (plan) {
      setValue('plan_cycle', plan.cycle ?? 'mensal', { shouldDirty: true });
    }
  }, [selectedPlanId, planType, plansData, setValue]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="documento" className="text-sm font-semibold text-slate-700">Documento (CPF/CNPJ)</label>
          <input 
            id="documento"
            {...register('documento', {
              required: selectedPlanId !== 'livre' ? 'CPF/CNPJ é obrigatório para planos pagos' : false
            })}
            required={selectedPlanId !== 'livre'}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
            placeholder="000.000.000-00"
          />
          {formState.errors.documento && <span className="text-red-500 text-xs">{String(formState.errors.documento.message)}</span>}
        </div>

        <div className="space-y-2">
          <label htmlFor="plan_id" className="text-sm font-semibold text-slate-700">Plano</label>
          <select 
            id="plan_id"
            {...register('plan_id')}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="livre">Livre</option>
            <option value="personalizado">Personalizado</option>
            
            {plansData?.active && plansData.active.length > 0 && (
              <optgroup label="Planos Ativos">
                {plansData.active.map((plan: any) => (
                  <option key={plan.slug} value={plan.slug}>{plan.nome}</option>
                ))}
              </optgroup>
            )}
            
            {plansData?.inactive && plansData.inactive.length > 0 && (
              <optgroup label="Planos Desativados">
                {plansData.inactive.map((plan: any) => (
                  <option key={plan.slug} value={plan.slug}>{plan.nome} (Desativado)</option>
                ))}
              </optgroup>
            )}

            {currentPlanId && 
              currentPlanId !== 'livre' && 
              currentPlanId !== 'personalizado' &&
              !plansData?.active?.some((p: any) => p.slug === currentPlanId) && 
              !plansData?.inactive?.some((p: any) => p.slug === currentPlanId) && (
                <option value={currentPlanId}>{currentPlanId}</option>
            )}
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
                disabled={planType === 'pago'}
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

            {!isAnualCycle && (
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
            )}
          </>
        )}
      </div>
    </>
  );
}

