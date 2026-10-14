import { describe, it, expect } from 'vitest';
import robots from './robots';

describe('robots.txt do admin', () => {
  it('bloqueia o painel inteiro, num único grupo para todos os robôs', () => {
    // Um grupo só: um grupo a mais (ex.: "User-agent: Googlebot / Allow: /")
    // faria o Google ignorar o "*" e o bloqueio sumiria.
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});
