import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

export const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'admin.json');

export default async function globalSetup() {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD são obrigatórios no .env');
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.getByLabel(/e-mail administrativo/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForURL('**/dashboard', { timeout: 30_000 });

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
