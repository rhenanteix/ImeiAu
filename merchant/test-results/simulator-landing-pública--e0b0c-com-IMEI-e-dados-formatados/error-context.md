# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simulator.spec.ts >> landing pública conclui trade-in com IMEI e dados formatados
- Location: tests/e2e/simulator.spec.ts:2:1

# Error details

```
Error: Channel closed
```

```
Error: locator.click: Test ended.
Call log:
  - waiting for locator('trade-in-widget').first().locator('dialog').getByRole('button', { name: 'Continuar' })

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e3]:
      - link "volta↗" [ref=f1e4] [cursor=pointer]:
        - /url: /
      - navigation "Menu principal" [ref=f1e5]:
        - link "Como funciona" [ref=f1e6] [cursor=pointer]:
          - /url: "#como-funciona"
        - link "Simular troca" [ref=f1e7] [cursor=pointer]:
          - /url: "#simular"
        - link "Entrar na plataforma ↗" [ref=f1e8] [cursor=pointer]:
          - /url: /dashboard
    - main [ref=f1e9]:
      - generic [ref=f1e10]:
        - generic [ref=f1e11]:
          - paragraph [ref=f1e12]: MENOS NA GAVETA. MAIS POSSIBILIDADES.
          - heading "Seu próximo começo está no seu usado." [level=1] [ref=f1e13]:
            - generic [ref=f1e14]: Seu próximo
            - generic [ref=f1e16]: começo está
            - generic [ref=f1e19]:
              - text: no seu
              - emphasis [ref=f1e20]: usado.
          - paragraph [ref=f1e21]: Seu celular ainda tem valor. Com o trade-in, você troca o aparelho que já tem por crédito para a próxima compra.
          - generic [ref=f1e22]:
            - button "Avaliar meu celular ↗" [ref=f1e24] [cursor=pointer]
            - link "Entenda a troca" [ref=f1e25] [cursor=pointer]:
              - /url: "#como-funciona"
              - text: Entenda a troca
              - generic [aria-hidden] [ref=f1e26]: ↓
          - paragraph [ref=f1e27]: Conheça a experiência · Sem compromisso · Demonstração
        - generic "Ilustração de um celular usado se transformando em crédito" [ref=f1e28]:
          - generic [ref=f1e30]: TODO APARELHO MERECE UMA NOVA VOLTA
          - generic [ref=f1e31]:
            - generic [ref=f1e32]: ● ●●
            - generic [ref=f1e34]: ↗
            - generic [ref=f1e35]: O que vem depois?
          - generic [ref=f1e36]:
            - generic [ref=f1e37]: SEU USADO → NOVAS POSSIBILIDADES
            - paragraph [ref=f1e38]: iPhone 13 · 128 GB
            - strong [ref=f1e39]: R$ 1.800,00
            - generic [ref=f1e40]: Exemplo ilustrativo de crédito
            - generic [ref=f1e41]: Uma troca. Um novo começo. ↗
          - generic [ref=f1e42]: 01 → 02DO USADO AO NOVO
      - generic [ref=f1e43]:
        - generic [ref=f1e44]: AVALIE SEU CELULAR
        - generic [ref=f1e45]: ↗
        - generic [ref=f1e46]: ENVIE PARA INSPEÇÃO
        - generic [ref=f1e47]: ↗
        - generic [ref=f1e48]: TRANSFORME EM CRÉDITO
      - generic [ref=f1e49]:
        - paragraph [ref=f1e50]: 01 / ENTENDA A TROCA
        - heading "Não é só trocar de celular. É aproveitar o valor dele." [level=2] [ref=f1e51]: Não é só trocar de celular.É aproveitar o valor dele.
        - generic [ref=f1e52]:
          - article [ref=f1e53]:
            - generic [ref=f1e54]: 01 ↗
            - heading "Conte sobre seu aparelho" [level=3] [ref=f1e55]
            - paragraph [ref=f1e56]: Escolha marca, modelo e armazenamento. Informe como estão a tela, a bateria e o funcionamento.
          - article [ref=f1e57]:
            - generic [ref=f1e58]: 02 ↗
            - heading "Conheça sua estimativa" [level=3] [ref=f1e59]
            - paragraph [ref=f1e60]: Veja o crédito calculado com as condições da loja. Você decide se quer continuar.
          - article [ref=f1e61]:
            - generic [ref=f1e62]: 03 ↗
            - heading "Confirme e envie" [level=3] [ref=f1e63]
            - paragraph [ref=f1e64]: Informe seus dados e o IMEI. Na operação real, uma autorização orienta o envio para inspeção.
          - article [ref=f1e65]:
            - generic [ref=f1e66]: 04 ↗
            - heading "Dê o próximo passo" [level=3] [ref=f1e67]
            - paragraph [ref=f1e68]: A loja confere o aparelho e libera o crédito conforme a modalidade escolhida. Uma divergência pode gerar uma nova proposta.
      - generic [ref=f1e69]:
        - generic [ref=f1e70]:
          - paragraph [ref=f1e71]: 02 / EXPERIMENTE AGORA
          - heading "Quanto vale a sua próxima volta?" [level=2] [ref=f1e72]: Quanto valea sua próxima volta?
          - paragraph [ref=f1e73]: Avalie seu aparelho, conheça a estimativa e conclua uma solicitação de teste. Tudo aqui, sem precisar entrar na plataforma.
          - generic [ref=f1e74]: Este ambiente usa cupons e códigos de postagem simulados. Não envie aparelhos com esses códigos.
        - generic [ref=f1e75]:
          - text: ↻
          - heading "Comece pelo que você já tem." [level=3] [ref=f1e76]
          - paragraph [ref=f1e77]: Tenha o modelo e o estado do celular em mãos. O IMEI só entra na confirmação.
          - button "Começar meu trade-in ↗" [ref=f1e79] [cursor=pointer]
          - generic [ref=f1e80]: Use o botão “Preencher dados de teste” no formulário.
      - generic [ref=f1e81]:
        - paragraph [ref=f1e82]: 03 / SEM DÚVIDAS NO CAMINHO
        - heading "Antes da próxima volta." [level=2] [ref=f1e83]
        - generic [ref=f1e84]:
          - group [ref=f1e85]:
            - generic "O que é trade-in? +" [ref=f1e86] [cursor=pointer]
          - group [ref=f1e87]:
            - generic "Onde encontro o IMEI? +" [ref=f1e88] [cursor=pointer]
          - group [ref=f1e89]:
            - generic "Quando recebo o crédito? +" [ref=f1e90] [cursor=pointer]
          - group [ref=f1e91]:
            - generic "Tenho uma loja. Onde gerencio as trocas? +" [ref=f1e92] [cursor=pointer]
      - generic [ref=f1e93]:
        - paragraph [ref=f1e94]: PARA QUEM VENDE
        - heading "Uma nova oportunidade para sua loja também." [level=2] [ref=f1e95]: Uma nova oportunidadepara sua loja também.
        - paragraph [ref=f1e96]: Configure preços, acompanhe as avaliações e teste a experiência do seu cliente em um só lugar.
        - link "Acessar plataforma do lojista ↗" [ref=f1e97] [cursor=pointer]:
          - /url: /dashboard
    - contentinfo [ref=f1e98]:
      - link "volta↗" [ref=f1e99] [cursor=pointer]:
        - /url: /
      - paragraph [ref=f1e100]: Tecnologia para fazer o valor circular.
      - generic [ref=f1e101]: Ambiente de demonstração
  - button "Open Next.js Dev Tools" [ref=f1e107] [cursor=pointer]
  - alert [ref=f1e111]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | test('landing pública conclui trade-in com IMEI e dados formatados', async ({ page, request }) => {
  3  |   await page.goto('/');
  4  |   await expect(page.getByRole('heading', { level: 1 })).toContainText('usado');
  5  |   await page.getByRole('button', { name: 'Avaliar meu celular' }).click();
  6  |   const dialog = page.locator('trade-in-widget').first().locator('dialog');
> 7  |   await dialog.getByRole('button', { name: 'Continuar' }).click();
     |                                                           ^ Error: locator.click: Test ended.
  8  |   await dialog.getByRole('button', { name: 'Calcular cotação' }).click();
  9  |   await dialog.getByRole('button', { name: 'Continuar' }).click();
  10 |   await dialog.getByRole('button', { name: 'Preencher dados de teste' }).click();
  11 |   await dialog.locator('#cpf').fill('529.982.247-25');
  12 |   await dialog.locator('#postal_code').fill('01001-000');
  13 |   await dialog.locator('#phone').fill('(11) 99999-9999');
  14 |   await dialog.locator('#state').fill('sp');
  15 |   await dialog.locator('#imei').fill('490154203237518');
  16 |   await dialog.locator('[name=consent]').check();
  17 |   const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/v1/tradein/create'));
  18 |   await dialog.getByRole('button', { name: 'Confirmar trade-in' }).click();
  19 |   const response = await responsePromise;
  20 |   expect(response.status(), await response.text()).toBe(201);
  21 |   await expect(dialog.getByText('Solicitação registrada. Guarde este resumo.')).toBeVisible();
  22 |   const original = response.request();
  23 |   const retry = await request.post('/api/v1/tradein/create', { headers: {'Idempotency-Key': original.headers()['idempotency-key']}, data: original.postDataJSON() });
  24 |   expect(retry.status()).toBe(201);
  25 |   expect((await retry.json()).id).toBe((await response.json()).id);
  26 |   await dialog.getByRole('button', { name: 'Concluir' }).click();
  27 |   await page.getByRole('button', { name: 'Avaliar meu celular' }).click();
  28 |   await expect(dialog.getByRole('heading', { name: 'Seu usado tem valor.' })).toBeVisible();
  29 | });
  30 | test('painel exige login e oferece simulador da loja autenticada', async ({ page }) => {
  31 |   await page.goto('/dashboard');
  32 |   await expect(page).toHaveURL(/\/login/);
  33 |   const response = await page.request.post('/api/auth/sign-in/email', {
  34 |     headers: { Origin: process.env.BETTER_AUTH_URL || 'http://localhost:3000' },
  35 |     data: { email: process.env.SEED_EMAIL || 'admin@volta.com.br', password: process.env.SEED_PASSWORD || 'Volta@2024!' },
  36 |   });
  37 |   expect(response.status()).toBe(200);
  38 |   await page.goto('/dashboard');
  39 |   await page.getByRole('button', { name: 'Simulador', exact: true }).click();
  40 |   const me = await (await page.request.get('/api/merchant/me')).json();
  41 |   await expect(page.locator('trade-in-widget')).toHaveAttribute('store-id', me.store.id);
  42 |   await page.getByRole('button', { name: 'Avaliar meu celular' }).click();
  43 |   await expect(page.getByRole('heading', { name: 'Seu usado tem valor.' })).toBeVisible();
  44 | });
  45 | test('landing se adapta ao celular e reduz movimento', async ({ page }) => {
  46 |   await page.setViewportSize({ width: 390, height: 844 });
  47 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  48 |   await page.goto('/');
  49 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  50 |   await expect(page.getByRole('link', { name: 'Entrar na plataforma' })).toBeVisible();
  51 |   await page.screenshot({ path: '/tmp/volta-landing-mobile.png', fullPage: true });
  52 | });
  53 | 
```