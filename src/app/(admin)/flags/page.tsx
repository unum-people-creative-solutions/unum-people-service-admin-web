'use client';

import { useEffect, useRef, useState } from 'react';
import { flagsService, type FlagVisao, type FlagEstado } from '@/services/flagsService';

const OPCOES: ReadonlyArray<{ valor: FlagEstado; rotulo: 'Desligada' | 'Só teste' | 'Ligada' }> = [
  { valor: 'desligada', rotulo: 'Desligada' },
  { valor: 'teste', rotulo: 'Só teste' },
  { valor: 'ligada', rotulo: 'Ligada' },
];

const MENSAGEM_CARGA = 'Não foi possível carregar as flags.';

function mensagemGravacao(chave: string): string {
  return `Não foi possível gravar a flag ${chave}.`;
}

function CartaoDaFlag({
  flag,
  desabilitada,
  exibirConfirmacao,
  mensagemErro,
  aoEscolher,
  aoConfirmar,
  aoCancelar,
}: {
  flag: FlagVisao;
  desabilitada: boolean;
  exibirConfirmacao: boolean;
  mensagemErro: string | null;
  aoEscolher: (estado: FlagEstado) => void;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  const tituloConfirmacao = `titulo-ligar-${flag.chave}`;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <fieldset className="space-y-4 p-6">
        <legend className="px-1 text-base font-semibold text-slate-900">{flag.chave}</legend>
        <p className="text-sm text-slate-500">{flag.descricao}</p>
        <p className="text-sm text-slate-500">Apps: {(flag.apps ?? []).join(', ')}</p>
        {flag.atualizado_em ? (
          <p className="text-sm text-slate-500">
            Atualizado em {new Date(flag.atualizado_em).toLocaleString('pt-BR')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-6">
          {OPCOES.map((opcao) => (
            <label key={opcao.valor} className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={`estado-${flag.chave}`}
                value={opcao.valor}
                checked={flag.estado === opcao.valor}
                disabled={desabilitada}
                onChange={() => aoEscolher(opcao.valor)}
              />
              {opcao.rotulo}
            </label>
          ))}
        </div>
        {mensagemErro ? (
          <p role="alert" className="text-sm text-red-600">
            {mensagemErro}
          </p>
        ) : null}
        {exibirConfirmacao ? (
          <div
            role="alertdialog"
            aria-labelledby={tituloConfirmacao}
            className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
          >
            <h2 id={tituloConfirmacao} className="text-sm font-semibold text-slate-900">
              Ligar para todos os clientes?
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                disabled={desabilitada}
                onClick={aoConfirmar}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                onClick={aoCancelar}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </fieldset>
    </section>
  );
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<FlagVisao[]>([]);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  // Várias flags podem gravar ao mesmo tempo: cada uma trava só os próprios radios.
  const [gravando, setGravando] = useState<ReadonlySet<string>>(new Set());
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const gravacoesAtuais = useRef(new Set<string>());

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await flagsService.listar();
        if (!ativo) {
          return;
        }
        setFlags(dados);
        setErroCarga(null);
      } catch (erro: unknown) {
        console.error(erro);
        if (!ativo) {
          return;
        }
        setErroCarga(MENSAGEM_CARGA);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  async function gravar(chave: string, estado: FlagEstado) {
    if (gravacoesAtuais.current.has(chave)) {
      return;
    }

    gravacoesAtuais.current.add(chave);
    setGravando(new Set(gravacoesAtuais.current));
    setErroGravacao(null);

    try {
      const resposta = await flagsService.atualizar(chave, estado);
      // A flag que a API devolve traz a data e o autor da mudança.
      setFlags((atuais) =>
        atuais.map((item) => (item.chave === chave ? { ...item, ...(resposta ?? { estado }) } : item)),
      );
      setConfirmacao((atual) => (atual === chave ? null : atual));
    } catch (erro: unknown) {
      console.error(erro);
      setErroGravacao(chave);
    } finally {
      gravacoesAtuais.current.delete(chave);
      setGravando(new Set(gravacoesAtuais.current));
    }
  }

  function escolher(flag: FlagVisao, estado: FlagEstado) {
    if (gravando.has(flag.chave) || estado === flag.estado) {
      return;
    }

    if (estado === 'ligada') {
      setErroGravacao(null);
      setConfirmacao(flag.chave);
      return;
    }

    setConfirmacao((atual) => (atual === flag.chave ? null : atual));
    void gravar(flag.chave, estado);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Flags</h1>
        <p className="text-slate-500">A mudança vale em até 1 minuto.</p>
      </div>

      {erroCarga ? (
        <p role="alert" className="text-sm text-red-600">
          {erroCarga}
        </p>
      ) : null}

      <div className="space-y-4">
        {flags.map((flag) => (
          <CartaoDaFlag
            key={flag.chave}
            flag={flag}
            desabilitada={gravando.has(flag.chave)}
            exibirConfirmacao={confirmacao === flag.chave}
            mensagemErro={erroGravacao === flag.chave ? mensagemGravacao(flag.chave) : null}
            aoEscolher={(estado) => escolher(flag, estado)}
            aoConfirmar={() => void gravar(flag.chave, 'ligada')}
            aoCancelar={() => setConfirmacao((atual) => (atual === flag.chave ? null : atual))}
          />
        ))}
      </div>
    </div>
  );
}
