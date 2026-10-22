'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

import { googleAdsService, type GoogleAdsMaster } from '@/services/googleAdsService';
import { ApiError } from '@/lib/apiError';

const CLASSE_PRIMARIO =
  'bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50';

const FORMATO_MCC = /^\d{3}-\d{3}-\d{4}$/;
const MENSAGEM_FORMATO = 'Use o formato 000-000-0000.';

const AJUDA_MCC =
  'Opcional. Vazio, os envios saem sem conta gerenciadora, e a conta Google conectada precisa acessar diretamente as contas dos clientes. Preenchido, os envios usam esta MCC; um ID errado faz o Google recusar os envios dos tenants que usam a autenticação MCC.';

function formatarConectadoEm(iso: string) {
  const data = new Date(iso);
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${valor('day')}/${valor('month')}/${valor('year')} ${valor('hour')}:${valor('minute')}`;
}

function textoDaConta(dados: GoogleAdsMaster) {
  if (!dados.conectado) return 'Não conectada.';
  if (!dados.email) {
    return 'Conectada (conta não identificada). Reconecte pela tela de tenants do CRM para registrar a conta.';
  }
  if (!dados.conectado_em.trim()) return `Conectada como ${dados.email}`;
  return `Conectada como ${dados.email} em ${formatarConectadoEm(dados.conectado_em)}`;
}

// O apiFetch lança ApiError com o status e o corpo da resposta (src/lib/apiError.ts).
function campoInvalido(erro: unknown) {
  return erro instanceof ApiError && erro.status === 400 && erro.detalhes.error === 'invalid_field';
}

export default function SecaoGoogleAds() {
  const [dados, setDados] = useState<GoogleAdsMaster | null>(null);
  const [erroCarga, setErroCarga] = useState(false);
  const [mcc, setMcc] = useState('');
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await googleAdsService.obter();
        setDados(resposta);
        setMcc(resposta.mcc_customer_id ?? '');
      } catch (erro) {
        console.error(erro);
        setErroCarga(true);
      }
    }

    void carregar();
  }, []);

  function aoMudarMcc(valor: string) {
    setMcc(valor);
    setErroCampo(null);
    setSucesso(false);
  }

  async function salvar() {
    if (pendente) return;

    const valor = mcc.trim();
    if (valor !== '' && !FORMATO_MCC.test(valor)) {
      setErroCampo(MENSAGEM_FORMATO);
      setErroSalvar(null);
      setSucesso(false);
      return;
    }

    setPendente(true);
    setErroCampo(null);
    setErroSalvar(null);
    setSucesso(false);

    try {
      const resposta = await googleAdsService.atualizarMcc(valor);
      setDados(resposta);
      setMcc(resposta.mcc_customer_id ?? '');
      setSucesso(true);
    } catch (erro) {
      console.error(erro);
      if (campoInvalido(erro)) {
        setErroCampo(MENSAGEM_FORMATO);
      } else {
        setErroSalvar('Não foi possível salvar a MCC.');
      }
    } finally {
      setPendente(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2">
        <Megaphone size={20} className="text-primary-600" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800">Google Ads</h2>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {erroCarga ? (
          <p role="alert">Não foi possível carregar a configuração do Google Ads.</p>
        ) : null}

        {!dados && !erroCarga ? <p className="text-sm text-slate-600">Carregando Google Ads…</p> : null}

        {dados ? (
          <>
            <p className="text-sm font-medium text-slate-800">{textoDaConta(dados)}</p>
            <p className="text-sm text-slate-600">
              Como conectar: pela tela de tenants do CRM, com o perfil GlobalAdmin.
            </p>

            <div className="flex flex-col gap-2">
              <label htmlFor="mcc-customer-id" className="text-sm font-medium text-slate-800">
                ID da MCC
              </label>
              <input
                id="mcc-customer-id"
                value={mcc}
                placeholder="000-000-0000"
                onChange={(evento) => aoMudarMcc(evento.target.value)}
                aria-invalid={erroCampo ? true : undefined}
                aria-describedby={
                  erroCampo ? 'mcc-customer-id-erro mcc-customer-id-ajuda' : 'mcc-customer-id-ajuda'
                }
                className={`w-full max-w-xs rounded-lg border px-3 py-2 text-sm text-slate-800 ${
                  erroCampo ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {erroCampo ? (
                <p id="mcc-customer-id-erro" className="text-sm text-red-700">
                  {erroCampo}
                </p>
              ) : null}
              <p id="mcc-customer-id-ajuda" className="text-sm text-slate-600">
                {AJUDA_MCC}
              </p>
            </div>

            <p className="text-sm text-slate-700">
              {`Tenants usando a autenticação MCC: ${dados.tenants_usando}`}
            </p>

            <button
              type="button"
              className={`${CLASSE_PRIMARIO} self-start`}
              disabled={pendente}
              onClick={() => void salvar()}
            >
              {pendente ? 'Salvando…' : 'Salvar'}
            </button>

            {sucesso ? (
              <p role="status" className="text-sm text-slate-600">
                MCC salva.
              </p>
            ) : null}
            {erroSalvar ? <p role="alert">{erroSalvar}</p> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
