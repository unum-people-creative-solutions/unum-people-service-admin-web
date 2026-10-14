import { describe, it, expect } from 'vitest';
import robots from './robots';

describe('robots.txt do admin', () => {
  it('bloqueia o painel inteiro', () => {
    const { rules } = robots();
    const regra = Array.isArray(rules) ? rules[0] : rules;
    expect(regra.userAgent).toBe('*');
    expect(regra.disallow).toBe('/');
    expect(regra.allow).toBeUndefined();
  });
});
