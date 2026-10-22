import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// google-ads-mcc-configuracoes: a seção Google Ads fica montada em Configurações,
// abaixo da seção do modo teste.
describe('Configurações — seção Google Ads', () => {
  it('a página importa e monta a SecaoGoogleAds depois da ModoTesteSecao', () => {
    const fonte = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(fonte).toMatch(/import SecaoGoogleAds from '\.\/SecaoGoogleAds';/);
    const modo = fonte.indexOf('<ModoTesteSecao />');
    const ads = fonte.indexOf('<SecaoGoogleAds />');
    expect(modo).toBeGreaterThan(-1);
    expect(ads).toBeGreaterThan(modo);
  });
});
