'use client';

import { ChangeEvent, forwardRef } from 'react';

// Máscara "centavos primeiro": cada dígito digitado entra pela direita, exatamente
// como em apps bancários. Evita por completo a ambiguidade vírgula/ponto do
// <input type="number"> nativo, que descarta silenciosamente valores como "150,50"
// (vírgula é inválida nesse input — vira NaN no JS e null no JSON enviado ao backend).
function digitsToReais(rawDigits: string): number {
  const digits = rawDigits.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

function formatBRL(value: number): string {
  return (value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface CurrencyInputBRProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  className?: string;
}

export const CurrencyInputBR = forwardRef<HTMLInputElement, CurrencyInputBRProps>(
  ({ id, name, value, onChange, onBlur, readOnly, className }, ref) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange(digitsToReais(e.target.value));
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
          R$
        </span>
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          readOnly={readOnly}
          value={formatBRL(value)}
          onChange={handleChange}
          onBlur={onBlur}
          className={
            className ??
            'w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white read-only:bg-slate-100 read-only:text-slate-500'
          }
        />
      </div>
    );
  }
);

CurrencyInputBR.displayName = 'CurrencyInputBR';
