import { describe, it, expect } from 'vitest';
import { formatCpfCnpj, isValidCpfCnpj } from './cpfCnpj';

describe('formatCpfCnpj', () => {
  it('formata progressivamente como CPF enquanto até 11 dígitos forem digitados', () => {
    expect(formatCpfCnpj('1')).toBe('1');
    expect(formatCpfCnpj('123')).toBe('123');
    expect(formatCpfCnpj('1234')).toBe('123.4');
    expect(formatCpfCnpj('123456789')).toBe('123.456.789');
    expect(formatCpfCnpj('12345678900')).toBe('123.456.789-00');
  });

  it('formata como CNPJ a partir do 12º dígito', () => {
    expect(formatCpfCnpj('123456789012')).toBe('12.345.678/9012');
    expect(formatCpfCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('é idempotente ao reformatar um valor já mascarado', () => {
    expect(formatCpfCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  it('ignora caracteres não numéricos e limita a 14 dígitos', () => {
    expect(formatCpfCnpj('11222333000181999')).toBe('11.222.333/0001-81');
  });
});

describe('isValidCpfCnpj', () => {
  it('valida CPF correto (com ou sem máscara)', () => {
    expect(isValidCpfCnpj('123.456.789-09')).toBe(true);
    expect(isValidCpfCnpj('12345678909')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado ou todos os dígitos iguais', () => {
    expect(isValidCpfCnpj('123.456.789-00')).toBe(false);
    expect(isValidCpfCnpj('111.111.111-11')).toBe(false);
  });

  it('valida CNPJ correto (com ou sem máscara)', () => {
    expect(isValidCpfCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCpfCnpj('11222333000181')).toBe(true);
  });

  it('rejeita CNPJ com dígito verificador errado ou todos os dígitos iguais', () => {
    expect(isValidCpfCnpj('11.222.333/0001-80')).toBe(false);
    expect(isValidCpfCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('rejeita documentos com quantidade de dígitos diferente de 11 ou 14', () => {
    expect(isValidCpfCnpj('123')).toBe(false);
    expect(isValidCpfCnpj('123456789012345')).toBe(false);
    expect(isValidCpfCnpj('')).toBe(false);
  });
});
