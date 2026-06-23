import React, { useState, useEffect } from 'react';
import { Tenant, Contract } from '@/types/tenant';
import { tenantService } from '@/services/tenantService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

interface BillingCardProps {
  tenant: Tenant;
  contract?: Contract;
}

export function BillingCard({ tenant, contract }: BillingCardProps) {
  const [localContract, setLocalContract] = useState<Contract | undefined>(contract);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRetryingActivation, setIsRetryingActivation] = useState(false);
  const [activationErrorMsg, setActivationErrorMsg] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const reactivateMutation = useMutation({
    mutationFn: () => tenantService.reactivateTenant(tenant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenant.id] });
    },
  });

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelErrorMsg, setCancelErrorMsg] = useState<string | null>(null);
  const [cancelStep, setCancelStep] = useState<1 | 2>(1);

  const cancelMutation = useMutation({
    mutationFn: () => tenantService.cancelTenant(tenant.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenant.id] });
      setCancelErrorMsg(null);
      setCancelDialogOpen(false);
    },
    onError: (error: any) => {
      setCancelErrorMsg(error.message || 'Falha ao cancelar contrato.');
    }
  });

  useEffect(() => {
    setLocalContract(contract);
  }, [contract]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (localContract?.subscription_url_state === 'gerando') {
      interval = setInterval(async () => {
        try {
          const updatedTenant = await tenantService.getById(tenant.id);
          setLocalContract(updatedTenant.contract);
        } catch (error) {
          console.error('Failed to poll tenant state:', error);
        }
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [localContract?.subscription_url_state, tenant.id]);

  const copyToClipboard = () => {
    if (localContract?.subscription_invoice_url) {
      navigator.clipboard.writeText(localContract.subscription_invoice_url);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMsg(null);
    try {
      await tenantService.retryBilling(tenant.id);
      setLocalContract(prev => prev ? { ...prev, subscription_url_state: 'gerando' } : prev);
    } catch (err) {
      setErrorMsg('Falha ao tentar novamente.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryActivation = async () => {
    setIsRetryingActivation(true);
    setActivationErrorMsg(null);
    try {
      await tenantService.retryActivation(tenant.id);
    } catch (err) {
      setActivationErrorMsg('Falha ao tentar ativação.');
    } finally {
      setIsRetryingActivation(false);
    }
  };

  const renderContent = () => {
    if (!localContract) return null;

    switch (localContract.subscription_url_state) {
      case 'aguardando_ativacao':
        return <p className="text-yellow-600">Aguardando ativação (Pendente)</p>;
      case 'gerando':
        return <p className="text-blue-600">Gerando link de pagamento...</p>;
      case 'disponivel':
        return (
          <div>
            <p className="text-green-600">Link de pagamento disponível!</p>
            <button
              onClick={copyToClipboard}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copiar Link
            </button>
          </div>
        );
      case 'erro':
        return (
          <div>
            <p className="text-red-600">Erro ao gerar link.</p>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {isRetrying ? 'Tentando...' : 'Tentar Novamente'}
            </button>
            {errorMsg && (
              <div role="alert" className="mt-2 p-2 bg-red-100 text-red-700 border border-red-300 rounded">
                {errorMsg}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const renderActivation = () => {
    if (tenant.status === 'pendente_asaas') {
      return (
        <div className="mb-4 pb-4 border-b">
          <p className="text-red-600">Falha ao gerar a cobrança de ativação no Asaas.</p>
          <button
            onClick={handleRetryActivation}
            disabled={isRetryingActivation}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {isRetryingActivation ? 'Tentando...' : 'Tentar Ativação'}
          </button>
          {activationErrorMsg && (
            <div role="alert" className="mt-2 p-2 bg-red-100 text-red-700 border border-red-300 rounded">
              {activationErrorMsg}
            </div>
          )}
        </div>
      );
    }

    if (localContract?.activation_invoice_url) {
      const isPaid = tenant.status !== 'aguardando_ativacao';
      return (
        <div className="mb-4 pb-4 border-b">
          <p className={isPaid ? 'text-green-600' : 'text-yellow-600'}>
            {isPaid ? 'Ativação paga' : 'Aguardando confirmação do pagamento da ativação'}
          </p>
          <a
            href={localContract.activation_invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all"
          >
            Link de ativação
          </a>
        </div>
      );
    }

    return null;
  };

  const renderReactivate = () => {
    if (tenant.status !== 'pausado') return null;

    return (
      <div className="mb-4 pb-4 border-b">
        <p className="text-yellow-600 mb-2">Assinatura pausada.</p>
        <button
          onClick={() => reactivateMutation.mutate()}
          disabled={reactivateMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {reactivateMutation.isPending ? 'Reativando...' : 'Reativar assinatura'}
        </button>
        {reactivateMutation.isError && (
          <div role="alert" className="mt-2 p-2 bg-red-100 text-red-700 border border-red-300 rounded">
            Falha ao reativar assinatura.
          </div>
        )}
      </div>
    );
  };

  const renderCancelContract = () => {
    if (tenant.status === 'cancelado') return null;

    return (
      <div className="mt-6 pt-4 border-t">
        <AlertDialog.Root open={cancelDialogOpen} onOpenChange={(open) => {
            if (!open && !cancelMutation.isPending) {
              setCancelDialogOpen(false);
              setCancelErrorMsg(null);
              setCancelStep(1);
            } else if (open) {
              setCancelDialogOpen(true);
            }
        }}>
          <AlertDialog.Trigger asChild>
            <button className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">
              Cancelar contrato
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow-lg max-w-md w-full">
              <AlertDialog.Title className="text-lg font-bold mb-2">
                Você tem certeza absoluta?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-gray-600 mb-4">
                Esta ação cancelará o contrato atual e a assinatura. Deseja continuar?
              </AlertDialog.Description>

              {cancelErrorMsg && (
                <div role="alert" className="mb-4 p-2 bg-red-100 text-red-700 border border-red-300 rounded">
                  {cancelErrorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <button 
                    disabled={cancelMutation.isPending}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Voltar
                  </button>
                </AlertDialog.Cancel>
                
                {cancelStep === 1 ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setCancelStep(2);
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelMutation.isPending ? 'Cancelando...' : 'Tenho certeza'}
                  </button>
                )}
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    );
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white" data-testid="billing-card">
      <h2 className="text-lg font-semibold mb-4">Faturamento</h2>
      {renderReactivate()}
      {renderActivation()}
      {renderContent()}
      {renderCancelContract()}
    </div>
  );
}
