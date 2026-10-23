'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { ApiError } from '@/lib/apiError';
import { CAMINHO_RETORNO, lerStateGuardado } from '@/lib/googleAdsOAuth';
import { googleAdsService } from '@/services/googleAdsService';

// Por que a volta do Google não pode seguir para a API; null = pode.
function motivoDaRecusa(params: URLSearchParams, guardado: string | null): string | null {
  if (params.get('error')) return 'O Google não autorizou a conexão.';
  const state = params.get('state');
  if (!params.get('code') || !state || state !== guardado) {
    return 'Não foi possível confirmar que este retorno veio deste navegador. Tente conectar de novo.';
  }
  return null;
}

function ConteudoRetorno() {
  const params = useSearchParams();
  const jaExecutou = useRef(false);
  const [carregando, setCarregando] = useState(true);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // StrictMode dispara o efeito duas vezes; a ref segura a segunda (o state
    // guardado é apagado na primeira leitura).
    if (jaExecutou.current) return;
    jaExecutou.current = true;

    const recusa = motivoDaRecusa(new URLSearchParams(params.toString()), lerStateGuardado());
    const codigo = params.get('code') ?? '';

    async function processar() {
      if (recusa) {
        setAlerta(recusa);
        setCarregando(false);
        return;
      }
      try {
        const resposta = await googleAdsService.conectar(codigo, `${window.location.origin}${CAMINHO_RETORNO}`);
        setEmail(resposta.email);
      } catch (erro) {
        console.error(erro);
        if (erro instanceof ApiError && erro.detalhes.error === 'google_recusou') {
          setAlerta('O Google recusou a autorização. Tente conectar de novo.');
        } else {
          setAlerta('Não foi possível conectar a conta Google.');
        }
      } finally {
        setCarregando(false);
      }
    }

    void processar();
  }, [params]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="font-semibold text-slate-800">Google Ads</h1>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {carregando ? <p className="text-sm text-slate-600">Conectando a conta Google…</p> : null}

          {email !== null ? (
            <p role="status">{email ? `Conta Google conectada: ${email}.` : 'Conta Google conectada.'}</p>
          ) : null}

          {alerta ? <p role="alert">{alerta}</p> : null}

          {carregando ? null : (
            <Link href="/settings" className="text-sm font-medium text-primary-600 self-start">
              Voltar para Configurações
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PaginaRetornoGoogleAds() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Conectando a conta Google…</p>}>
      <ConteudoRetorno />
    </Suspense>
  );
}
