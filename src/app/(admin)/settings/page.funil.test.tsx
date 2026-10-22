import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// funil-configurador-f2 RF-20: a seção fica montada em Configurações, depois do Google Ads.
describe('Configurações — seção Funil do Configurador', () => {
  it('a página importa e monta a SecaoFunilConfigurador depois da SecaoGoogleAds', () => {
    const fonte = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(fonte).toMatch(/import SecaoFunilConfigurador from '\.\/SecaoFunilConfigurador';/);
    const ads = fonte.indexOf('<SecaoGoogleAds />');
    const funil = fonte.indexOf('<SecaoFunilConfigurador />');
    expect(ads).toBeGreaterThan(-1);
    expect(funil).toBeGreaterThan(ads);
  });
});
