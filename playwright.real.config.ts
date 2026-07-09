import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Next.js carrega `.env` automaticamente para o processo do `next dev`
 * (iniciado pelo `webServer` abaixo), mas o processo do Playwright (que
 * roda os specs em Node puro) não tem esse carregamento. Os specs
 * precisam de `NEXT_PUBLIC_API_URL` para montar as interceptações de rede
 * (`page.route`) com a mesma base URL que o app vai chamar de fato — por
 * isso fazemos aqui um parse mínimo do `.env`, sem introduzir a
 * dependência `dotenv` só para isso.
 */
function loadDotEnv(file: string) {
  const fullPath = path.resolve(__dirname, file);
  if (!fs.existsSync(fullPath)) return;

  const contents = fs.readFileSync(fullPath, 'utf-8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv('.env');

/**
 * Configuração de E2E real (Playwright) para o admin-web.
 *
 * Diferente da config padrão (`playwright.config.ts`), esta config:
 * - Realiza login real via UI do Playwright contra o Cognito
 * - Persiste o storage state em `e2e/real/.auth/admin.json`
 * - Assume que o dev server já está rodando (`reuseExistingServer: true`)
 * - Evita concorrência para não gerar conflitos de sessão real
 *
 * Uso: `npm run test:e2e:real` (requer `E2E_ADMIN_EMAIL` e
 * `E2E_ADMIN_PASSWORD` no `.env`)
 */
export default defineConfig({
  testDir: './e2e/real',
  globalSetup: './e2e/real/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['html', { outputFolder: 'playwright-report-real' }]],
  use: {
    baseURL: 'http://localhost:3000',
    storageState: './e2e/real/.auth/admin.json',
    actionTimeout: 15_000,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
