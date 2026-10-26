import { test, expect } from '@playwright/test';
test('landing pública conclui trade-in com IMEI e dados formatados', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('usado');
  await page.getByRole('button', { name: 'Avaliar meu celular' }).click();
  const dialog = page.locator('trade-in-widget').first().locator('dialog');
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByRole('button', { name: 'Calcular cotação' }).click();
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByRole('button', { name: 'Preencher dados de teste' }).click();
  await dialog.locator('#cpf').fill('529.982.247-25');
  await dialog.locator('#postal_code').fill('01001-000');
  await dialog.locator('#phone').fill('(11) 99999-9999');
  await dialog.locator('#state').fill('sp');
  await dialog.locator('#imei').fill('490154203237518');
  await dialog.locator('[name=consent]').check();
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/v1/tradein/create'));
  await dialog.getByRole('button', { name: 'Confirmar trade-in' }).click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(201);
  await expect(dialog.getByText('Solicitação registrada. Guarde este resumo.')).toBeVisible();
  const original = response.request();
  const retry = await request.post('/api/v1/tradein/create', { headers: {'Idempotency-Key': original.headers()['idempotency-key']}, data: original.postDataJSON() });
  expect(retry.status()).toBe(201);
  expect((await retry.json()).id).toBe((await response.json()).id);
  await dialog.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: 'Avaliar meu celular' }).click();
  await expect(dialog.getByRole('heading', { name: 'Seu usado tem valor.' })).toBeVisible();
});
test('painel exige login e oferece simulador da loja autenticada', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  const response = await page.request.post('/api/auth/sign-in/email', {
    headers: { Origin: process.env.BETTER_AUTH_URL || 'http://localhost:3000' },
    data: { email: process.env.SEED_EMAIL || 'admin@volta.com.br', password: process.env.SEED_PASSWORD || 'Volta@2024!' },
  });
  expect(response.status()).toBe(200);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Simulador', exact: true }).click();
  const me = await (await page.request.get('/api/merchant/me')).json();
  const preview = page.frameLocator('iframe[title="Prévia interativa do widget na loja"]');
  await expect(preview.locator('trade-in-widget')).toHaveAttribute('store-id', me.store.id);
  await expect(preview.locator('trade-in-widget')).toHaveAttribute('test-mode', '');
  const creates: string[] = [];
  page.on('request', request => { if (request.url().includes('/tradein/create')) creates.push(request.url()); });
  await preview.getByRole('button', { name: 'Troque seu celular por crédito' }).click();
  await page.locator('iframe').scrollIntoViewIfNeeded();
  const dialog = preview.locator('trade-in-widget').locator('dialog');
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByRole('button', { name: 'Calcular cotação' }).click();
  await dialog.getByRole('button', { name: 'Continuar' }).click();
  await dialog.getByRole('button', { name: 'Preencher dados de teste' }).click();
  await dialog.locator('[name=consent]').check();
  await dialog.getByRole('button', { name: 'Confirmar trade-in' }).click();
  await expect(dialog.getByRole('heading', { name: 'Teste concluído!' })).toBeVisible();
  expect(creates).toEqual([]);
  await page.getByRole('button', { name: 'Celular', exact: true }).click();
  await page.getByRole('button', { name: 'Reiniciar teste' }).click();
  await preview.getByRole('button', { name: 'Troque seu celular por crédito' }).click();
  await expect(dialog.getByRole('heading', { name: 'Seu usado tem valor.' })).toBeVisible();
});
test('landing se adapta ao celular e reduz movimento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: 'Entrar na plataforma' })).toBeVisible();
  await page.screenshot({ path: '/tmp/volta-landing-mobile.png', fullPage: true });
});
