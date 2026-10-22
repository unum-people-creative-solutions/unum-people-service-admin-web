'use client';

import { useEffect, useState } from 'react';
import { Workflow } from 'lucide-react';

import { funilConfiguradorService, type FunilConfigurador } from '@/services/funilConfiguradorService';
import { ApiError } from '@/lib/apiError';

const CLASSE_PRIMARIO =
  'bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50';

const MENSAGEM_TENANT_REAL = 'Informe um tenant que existe e não é de teste.';
const MENSAGEM_TENANT_TESTE = 'Informe um tenant de teste que existe.';

const TEXTO_FUNIL =
  'Contratações reais criam o lead e as vendas no tenant real; contratações em modo teste, no tenant de teste. Vazio desliga. O Google Ads do tenant de teste deve usar uma conta de testes: sem Ação de venda, nada é enviado.';

// O apiFetch lança ApiError com o status e o corpo da resposta (src/lib/apiError.ts).
function campoInvalido(erro: unknown): erro is ApiError {
  return erro instanceof ApiError && erro.status === 400 && erro.detalhes.error === 'invalid_field';
}

export default function SecaoFunilConfigurador() {
  const [dados, setDados] = useState<FunilConfigurador | null>(null);
  const [erroCarga, setErroCarga] = useState(false);
  const [tenantReal, setTenantReal] = useState('');
  const [tenantTeste, setTenantTeste] = useState('');
  const [erroReal, setErroReal] = useState<string | null>(null);
  const [erroTeste, setErroTeste] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const resposta = await funilConfiguradorService.obter();
        setDados(resposta);
        setTenantReal(resposta.tenant_real);
        setTenantTeste(resposta.tenant_teste);
      } catch (erro) {
        console.error(erro);
        setErroCarga(true);
      }
    }

    void carregar();
  }, []);

  function aoMudarReal(valor: string) {
    setTenantReal(valor);
    setErroReal(null);
    setSucesso(false);
  }

  function aoMudarTeste(valor: string) {
    setTenantTeste(valor);
    setErroTeste(null);
    setSucesso(false);
  }

  async function salvar() {
    if (pendente) return;

    setPendente(true);
    setErroReal(null);
    setErroTeste(null);
    setErroSalvar(null);
    setSucesso(false);

    try {
      const resposta = await funilConfiguradorService.atualizar(tenantReal.trim(), tenantTeste.trim());
      setDados(resposta);
      setTenantReal(resposta.tenant_real);
      setTenantTeste(resposta.tenant_teste);
      setSucesso(true);
    } catch (erro) {
      console.error(erro);
      if (campoInvalido(erro)) {
        const campo = erro.detalhes.field;
        if (campo === 'tenant_real') {
          setErroReal(MENSAGEM_TENANT_REAL);
        } else if (campo === 'tenant_teste') {
          setErroTeste(MENSAGEM_TENANT_TESTE);
        } else {
          setErroSalvar('Não foi possível salvar o funil.');
        }
      } else {
        setErroSalvar('Não foi possível salvar o funil.');
      }
    } finally {
      setPendente(false);
    }
  }

  // O nome é do tenant salvo: com outro ID no campo, não aparece.
  const nomeReal = dados && tenantReal.trim() === dados.tenant_real ? dados.tenant_real_nome.trim() : '';
  const nomeTeste = dados && tenantTeste.trim() === dados.tenant_teste ? dados.tenant_teste_nome.trim() : '';

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2">
        <Workflow size={20} className="text-primary-600" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800">Funil do Configurador</h2>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {erroCarga ? (
          <p role="alert">Não foi possível carregar o funil do Configurador.</p>
        ) : null}

        {!dados && !erroCarga ? (
          <p className="text-sm text-slate-600">Carregando funil do Configurador…</p>
        ) : null}

        {dados ? (
          <>
            <p className="text-sm text-slate-600">{TEXTO_FUNIL}</p>

            <div className="flex flex-col gap-2">
              <label htmlFor="funil-tenant-real" className="text-sm font-medium text-slate-800">
                Tenant que recebe as contratações
              </label>
              <input
                id="funil-tenant-real"
                value={tenantReal}
                placeholder="ID do tenant"
                onChange={(evento) => aoMudarReal(evento.target.value)}
                aria-invalid={erroReal ? true : undefined}
                aria-describedby={
                  [erroReal ? 'funil-tenant-real-erro' : '', nomeReal ? 'funil-tenant-real-nome' : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className={`w-full max-w-xs rounded-lg border px-3 py-2 text-sm text-slate-800 ${
                  erroReal ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {erroReal ? (
                <p id="funil-tenant-real-erro" className="text-sm text-red-700">
                  {erroReal}
                </p>
              ) : null}
              {nomeReal ? (
                <p id="funil-tenant-real-nome" className="text-sm text-slate-600">
                  {nomeReal}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="funil-tenant-teste" className="text-sm font-medium text-slate-800">
                Tenant que recebe as contratações em modo teste
              </label>
              <input
                id="funil-tenant-teste"
                value={tenantTeste}
                placeholder="ID do tenant"
                onChange={(evento) => aoMudarTeste(evento.target.value)}
                aria-invalid={erroTeste ? true : undefined}
                aria-describedby={
                  [erroTeste ? 'funil-tenant-teste-erro' : '', nomeTeste ? 'funil-tenant-teste-nome' : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                className={`w-full max-w-xs rounded-lg border px-3 py-2 text-sm text-slate-800 ${
                  erroTeste ? 'border-red-300' : 'border-slate-200'
                }`}
              />
              {erroTeste ? (
                <p id="funil-tenant-teste-erro" className="text-sm text-red-700">
                  {erroTeste}
                </p>
              ) : null}
              {nomeTeste ? (
                <p id="funil-tenant-teste-nome" className="text-sm text-slate-600">
                  {nomeTeste}
                </p>
              ) : null}
            </div>

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
                Funil salvo.
              </p>
            ) : null}
            {erroSalvar ? <p role="alert">{erroSalvar}</p> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
