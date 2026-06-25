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
 * Configuração de E2E (Playwright) para o admin-web.
 *
 * Convenção herdada de `unum-people-sites/unum-people-site/playwright.config.ts`
 * (mesmo monorepo), adaptada para este app:
 * - App Router do Next.js 16, servido via `npm run dev` (porta 3000).
 * - Autenticação real é via Cognito (ver `src/store/useAuthStore.ts` e
 *   `src/lib/cognito.ts`) e o backend é um Lambda/API Gateway externo —
 *   não há backend local para os testes E2E baterem. Os specs devem
 *   simular o estado autenticado via localStorage (chave
 *   `admin-auth-storage`, a mesma usada pelo `zustand/persist` do
 *   useAuthStore) e interceptar as chamadas de API com `page.route(...)`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
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
    reuseExistingServer: !process.env.CI,
  },
});
