'use client';

import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';

import { settingsService, type ModoTesteEstado } from '@/services/settingsService';

type Acao = 'gerar' | 'rotacionar' | 'desligar';

const MENSAGEM: Record<Acao, string> = {
  gerar: 'Gerar um token para o modo teste?',
  rotacionar: 'O token atual deixa de funcionar na hora. Quem estiver testando precisa do link novo.',
  desligar: 'Desligar o modo teste? Todo link de teste deixa de funcionar.',
};

const CLASSE_PRIMARIO =
  'bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50';

function linkDoToken(token: string) {
  const base = process.env.NEXT_PUBLIC_CONFIGURADOR_URL || 'https://unumpeople.app';
  return base + '/configurar?teste=' + encodeURIComponent(token);
}

export default function ModoTesteSecao() {
  const [estado, setEstado] = useState<ModoTesteEstado | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [pendente, setPendente] = useState(false);
  const [linkVisivel, setLinkVisivel] = useState(false);
  const [copia, setCopia] = useState<{ alvo: 'link' | 'comando'; resultado: 'ok' | 'erro' } | null>(null);

  // Permissão negada ou contexto não seguro não podem falhar em silêncio.
  async function copiar(alvo: 'link' | 'comando', texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopia({ alvo, resultado: 'ok' });
    } catch (erro) {
      console.error(erro);
      setCopia({ alvo, resultado: 'erro' });
    }
  }

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await settingsService.obterModoTeste();
        setEstado(dados);
      } catch (erro) {
        console.error(erro);
        setErroCarga('Não foi possível carregar o modo teste.');
      }
    }

    void carregar();
  }, []);

  function abrir(proxima: Acao) {
    setErroAcao(null);
    setAcao(proxima);
  }

  async function confirmar() {
    if (!acao || pendente) return;

    setPendente(true);
    setErroAcao(null);

    try {
      if (acao === 'desligar') {
        await settingsService.desligarModoTeste();
        setEstado({ ativo: false });
        setLinkVisivel(false);
      } else {
        const resultado = await settingsService.rotacionarModoTeste();
        setEstado({
          ativo: true,
          token: resultado.token,
          rotacionado_em: resultado.rotacionado_em,
        });
        setLinkVisivel(true);
        setCopia(null);
      }
      setAcao(null);
    } catch (erro) {
      console.error(erro);
      setErroAcao(
        acao === 'desligar'
          ? 'Não foi possível desligar o modo teste.'
          : 'Não foi possível gerar o token.',
      );
    } finally {
      setPendente(false);
    }
  }

  const link = estado?.token ? linkDoToken(estado.token) : null;
  // O mesmo token, para quem prefere ativar pelo console do navegador (unumTeste.ativar).
  const comando = estado?.token ? `unumTeste.ativar('${estado.token}')` : '';

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2">
        <FlaskConical size={20} className="text-primary-600" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800">Modo teste do checkout</h2>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <p className="text-sm text-slate-600">
          Quem abrir o link contrata como teste: o tenant nasce de teste e é cobrado no sandbox do Asaas.
        </p>

        {erroCarga ? <p role="alert">{erroCarga}</p> : null}

        {estado ? (
          <>
            <p className="text-sm font-medium text-slate-800">{estado.ativo ? 'Ativo' : 'Desligado'}</p>

            {estado.rotacionado_em ? (
              <p className="text-sm text-slate-500">
                {'Rotacionado em ' + new Date(estado.rotacionado_em).toLocaleString('pt-BR')}
              </p>
            ) : null}

            {estado.ativo && link && linkVisivel ? (
              <>
                <p className="text-sm break-all text-slate-700">{link}</p>
                <button type="button" className={`${CLASSE_PRIMARIO} self-start`} onClick={() => void copiar('link', link)}>
                  Copiar link
                </button>
                <p className="text-sm text-slate-600">
                  Ou, no console do navegador (F12) em unumpeople.app:
                </p>
                <p className="text-sm break-all font-mono text-slate-700">{comando}</p>
                <button type="button" className={`${CLASSE_PRIMARIO} self-start`} onClick={() => void copiar('comando', comando)}>
                  Copiar comando
                </button>
                {copia?.resultado === 'ok' ? (
                  <p role="status" className="text-sm text-slate-600">
                    {copia.alvo === 'link' ? 'Link copiado.' : 'Comando copiado.'}
                  </p>
                ) : null}
                {copia?.resultado === 'erro' ? (
                  <p role="alert">
                    {copia.alvo === 'link' ? 'Não foi possível copiar o link.' : 'Não foi possível copiar o comando.'}
                  </p>
                ) : null}
              </>
            ) : null}

            {estado.ativo && link && !linkVisivel ? (
              <button type="button" className={`${CLASSE_PRIMARIO} self-start`} onClick={() => setLinkVisivel(true)}>
                Mostrar link
              </button>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {estado.ativo ? (
                <>
                  <button type="button" className={CLASSE_PRIMARIO} disabled={pendente} onClick={() => abrir('rotacionar')}>
                    Rotacionar token
                  </button>
                  <button
                    type="button"
                    className="border border-red-200 text-red-700 px-4 py-2 rounded-lg disabled:opacity-50"
                    disabled={pendente}
                    onClick={() => abrir('desligar')}
                  >
                    Desligar modo teste
                  </button>
                </>
              ) : (
                <button type="button" className={CLASSE_PRIMARIO} disabled={pendente} onClick={() => abrir('gerar')}>
                  Gerar token
                </button>
              )}
            </div>
          </>
        ) : null}

        {acao ? (
          <div
            role="alertdialog"
            aria-labelledby="modo-teste-confirmacao-titulo"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3"
          >
            <p id="modo-teste-confirmacao-titulo" className="text-sm text-slate-800">
              {MENSAGEM[acao]}
            </p>
            {erroAcao ? <p role="alert">{erroAcao}</p> : null}
            <div className="flex gap-2">
              <button type="button" className={CLASSE_PRIMARIO} disabled={pendente} onClick={() => void confirmar()}>
                Confirmar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-50"
                disabled={pendente}
                onClick={() => setAcao(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
