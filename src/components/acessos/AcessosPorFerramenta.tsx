'use client';

import type { Catalogo, FerramentaCatalogo, MudancasDeAcesso, PapelPersonalizado } from '@/types/acesso';

interface AcessosPorFerramentaProps {
  catalogo: Catalogo;
  papeis: PapelPersonalizado[];
  servicosContratados: string[];
  valor: MudancasDeAcesso;
  aoMudar: (valor: MudancasDeAcesso) => void;
  desabilitado?: boolean;
}

// Portal entra sempre (serviço vazio). As outras, só se a empresa contratou.
export function ferramentasExibidas(catalogo: Catalogo, servicosContratados: readonly string[]): FerramentaCatalogo[] {
  return catalogo.ferramentas.filter(
    (ferramenta) => ferramenta.servico === '' || servicosContratados.includes(ferramenta.servico),
  );
}

function papeisDaFerramenta(papeis: readonly PapelPersonalizado[], ferramentaId: string): PapelPersonalizado[] {
  return papeis
    .filter((papel) => papel.ferramenta === ferramentaId)
    .toSorted((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function nomeImplicito(ferramenta: FerramentaCatalogo, portal: string | undefined): string {
  if ((portal ?? 'membro') === 'administrador') {
    return (
      ferramenta.papeis_sistema.find((papel) => papel.id === ferramenta.papel_mais_alto)?.nome
      ?? ferramenta.papel_mais_alto
    );
  }
  return 'Sem acesso';
}

export function AcessosPorFerramenta({
  catalogo,
  papeis,
  servicosContratados,
  valor,
  aoMudar,
  desabilitado = false,
}: AcessosPorFerramentaProps) {
  const ferramentas = ferramentasExibidas(catalogo, servicosContratados);

  return (
    <div className="space-y-4">
      {ferramentas.map((ferramenta) => {
        const personalizados = papeisDaFerramenta(papeis, ferramenta.id);
        const sistema = ferramenta.id === 'portal'
          ? ferramenta.papeis_sistema.filter((papel) => papel.id !== 'sem_acesso')
          : ferramenta.papeis_sistema;
        const selecionado = ferramenta.id === 'portal' ? (valor.portal ?? 'membro') : (valor[ferramenta.id] ?? '');

        return (
          <div key={ferramenta.id} className="space-y-1">
            <label htmlFor={ferramenta.id} className="block text-sm font-semibold text-slate-700">
              {ferramenta.nome}
            </label>
            <select
              id={ferramenta.id}
              value={selecionado}
              disabled={desabilitado}
              onChange={(evento) => aoMudar({ ...valor, [ferramenta.id]: evento.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {ferramenta.id !== 'portal' ? (
                <option value="">Automático ({nomeImplicito(ferramenta, valor.portal)})</option>
              ) : null}
              {sistema.map((papel) => (
                <option key={`sistema-${papel.id}`} value={papel.id}>
                  {papel.nome}
                </option>
              ))}
              {personalizados.map((papel) => (
                <option key={`personalizado-${papel.id}`} value={papel.id}>
                  {papel.nome}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
