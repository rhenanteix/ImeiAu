import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
const origin = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const headers = { Origin: origin };
const customer = {
  name: "Cliente teste automatizado",
  email: "teste@example.com",
  phone: "11999999999",
  cpf: "52998224725",
  address: {
    postal_code: "01001000",
    street: "Rua teste",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
  },
};
const condition = { powers_on: true, screen_intact: true, battery_ok: true };
async function login(request: APIRequestContext) {
  const response = await request.post("/api/auth/sign-in/email", {
    headers,
    data: {
      email: process.env.SEED_EMAIL,
      password: process.env.SEED_PASSWORD,
    },
  });
  expect(response.status(), await response.text()).toBe(200);
}
async function create(
  request: APIRequestContext,
  store_id = "demo",
  mode = "post_inspection",
) {
  const response = await request.post("/api/v1/tradein/create", {
    headers: { "Idempotency-Key": randomUUID() },
    data: {
      store_id,
      device_id:
        store_id === "demo" ? "iphone13-128" : `${store_id}-iphone13-128`,
      condition,
      mode,
      consent: true,
      customer,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json();
}
async function detail(request: APIRequestContext, id: string) {
  const response = await request.get("/api/merchant/tradeins/" + id);
  expect(response.status()).toBe(200);
  return response.json();
}
async function receive(request: APIRequestContext, id: string) {
  for (const status of ["shipped", "inspecting"]) {
    const row = await detail(request, id);
    const response = await request.patch(
      `/api/merchant/tradeins/${id}/status`,
      { headers, data: { status, version: row.version } },
    );
    expect(response.status(), await response.text()).toBe(200);
  }
  return detail(request, id);
}
test("proteção de sessão, isolamento entre lojas, regras e decisões", async ({
  request,
}) => {
  expect((await request.get("/api/merchant/settings")).status()).toBe(401);
  await login(request);
  const other = await create(request, "demo-inspection");
  expect(
    (await request.get("/api/merchant/tradeins/" + other.id)).status(),
  ).toBe(404);
  const settings = await (await request.get("/api/merchant/settings")).json();
  const patch = {
    mode: settings.mode,
    freightPayer: "customer",
    freightCents: 2500,
    marginBps: 1000,
    payoutMethod: "coupon",
    version: settings.version,
  };
  expect(
    (
      await request.patch("/api/merchant/settings", {
        headers: { Origin: "https://untrusted.example" },
        data: patch,
      })
    ).status(),
  ).toBe(403);
  const updated = await request.patch("/api/merchant/settings", {
    headers,
    data: patch,
  });
  expect(updated.status()).toBe(200);
  expect(
    (
      await request.patch("/api/merchant/settings", { headers, data: patch })
    ).status(),
  ).toBe(409);
  const quote = await request.post("/api/v1/quotes/calculate", {
    data: { store_id: "demo", device_id: "iphone13-128", condition },
  });
  expect((await quote.json()).estimated_value).toBe(159500);
  const restore = {
    ...patch,
    freightPayer: settings.freightPayer,
    freightCents: settings.freightCents,
    marginBps: settings.marginBps,
    version: (await updated.json()).version,
  };
  expect(
    (
      await request.patch("/api/merchant/settings", { headers, data: restore })
    ).status(),
  ).toBe(200);
  const row = await receive(request, (await create(request)).id);
  const inspection = {
    version: row.version,
    decision: "approve",
    checklist: { powersOn: true, imeiMatches: true, conditionMatches: true },
    notes: "Tudo conforme declarado",
  };
  expect(
    (
      await request.post(`/api/merchant/tradeins/${row.id}/inspection`, {
        headers,
        data: {
          ...inspection,
          checklist: { ...inspection.checklist, imeiMatches: false },
        },
      })
    ).status(),
  ).toBe(422);
  const approved = await request.post(
    `/api/merchant/tradeins/${row.id}/inspection`,
    { headers, data: inspection },
  );
  expect(approved.status(), await approved.text()).toBe(200);
  expect((await approved.json()).couponCode).toMatch(/^DEMO-CUPOM-/);
  expect(
    (
      await request.post(`/api/merchant/tradeins/${row.id}/inspection`, {
        headers,
        data: inspection,
      })
    ).status(),
  ).toBe(409);
  const counter = await receive(request, (await create(request)).id);
  const offered = await request.post(
    `/api/merchant/tradeins/${counter.id}/inspection`,
    {
      headers,
      data: {
        ...inspection,
        version: counter.version,
        decision: "counteroffer",
        checklist: { ...inspection.checklist, conditionMatches: false },
        notes: "Tela possui danos não declarados",
        amountCents: 100000,
      },
    },
  );
  expect(offered.status()).toBe(200);
  expect((await offered.json()).couponCode).toBeNull();
  const withOffer = await detail(request, counter.id);
  const token = withOffer.events
    .find((e: { type: string }) => e.type === "tradein.counteroffered")
    .payload.acceptanceUrl.split("#")[1];
  const accepted = await request.post("/api/offers/respond", {
    data: { token, accept: true },
  });
  expect(accepted.status()).toBe(200);
  expect((await accepted.json()).finalCents).toBe(100000);
  expect(
    (
      await request.post("/api/offers/respond", {
        data: { token, accept: true },
      })
    ).status(),
  ).toBe(409);
  const rejectRow = await receive(
    request,
    (await create(request, "demo", "instant_coupon")).id,
  );
  const rejected = await request.post(
    `/api/merchant/tradeins/${rejectRow.id}/inspection`,
    {
      headers,
      data: {
        ...inspection,
        version: rejectRow.version,
        decision: "reject",
        notes: "IMEI divergente da nota apresentada",
      },
    },
  );
  expect(rejected.status()).toBe(200);
  const rejectedData = await rejected.json();
  expect(rejectedData.couponCode).toBeNull();
  expect(rejectedData.returnShippingCode).toMatch(/^DEMO-RETURN-/);
  expect(rejectedData.preauthorizationStatus).toBe("released");
});
test("CRUD de aparelhos, idempotência e bloqueio de modalidade", async ({
  request,
}) => {
  await login(request);
  const device = {
    brand: "Teste",
    model: randomUUID(),
    storage: "128GB",
    basePriceCents: 100000,
    active: true,
  };
  const added = await request.post("/api/merchant/devices", {
    headers,
    data: device,
  });
  expect(added.status()).toBe(201);
  const row = await added.json();
  const edited = await request.patch("/api/merchant/devices/" + row.id, {
    headers,
    data: { ...device, basePriceCents: 120000, version: row.version },
  });
  expect(edited.status()).toBe(200);
  const search = await request.get("/api/merchant/devices?q=" + device.model);
  expect((await search.json())[0].basePriceCents).toBe(120000);
  const removed = await request.delete("/api/merchant/devices/" + row.id, {
    headers,
    data: { version: (await edited.json()).version },
  });
  expect(removed.status()).toBe(200);
  expect(
    (
      await request.post("/api/v1/quotes/calculate", {
        data: { store_id: "demo", device_id: row.id, condition },
      })
    ).status(),
  ).toBe(404);
  const data = {
    store_id: "demo",
    device_id: "iphone13-128",
    condition,
    mode: "post_inspection",
    consent: true,
    customer,
  };
  const key = randomUUID();
  const first = await request.post("/api/v1/tradein/create", {
    headers: { "Idempotency-Key": key },
    data,
  });
  const again = await request.post("/api/v1/tradein/create", {
    headers: { "Idempotency-Key": key },
    data,
  });
  expect((await first.json()).id).toBe((await again.json()).id);
  expect(
    (
      await request.post("/api/v1/tradein/create", {
        headers: { "Idempotency-Key": key },
        data: { ...data, customer: { ...customer, name: "Outro cliente" } },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/v1/tradein/create", {
        headers: { "Idempotency-Key": randomUUID() },
        data: {
          ...data,
          store_id: "demo-inspection",
          device_id: "demo-inspection-iphone13-128",
          mode: "instant_coupon",
        },
      })
    ).status(),
  ).toBe(422);
});
test("dashboard responsivo e jornada de vistoria pelo navegador", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(process.env.SEED_EMAIL!);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.SEED_PASSWORD!);
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(
    page.getByRole("heading", { name: "Solicitações", exact: true }),
  ).toBeVisible();
  const trade = await create(page.request);
  await receive(page.request, trade.id);
  await page.getByLabel("Filtrar por status").selectOption("inspecting");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await page.getByRole("button", { name: "Analisar" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("O aparelho liga normalmente?").check();
  await page.getByLabel("O IMEI confere com a nota apresentada?").check();
  await page.getByLabel("A condição confere com o declarado?").check();
  await page.getByRole("button", { name: "Confirmar aprovação" }).click();
  await expect(
    page.getByText("Operação aprovada", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Tabela de preços", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Regras de abatimento" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await expect(page.getByLabel("Margem global (%)")).toBeVisible();
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(
    page.getByText("Configurações salvas.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Solicitações", exact: true }).click();
  await expect(page.getByLabel("Filtrar por status")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("widget integrado cria solicitação no banco do dashboard", async ({
  page,
}) => {
  await page.goto("/demo.html");
  const widget = page.locator("trade-in-widget");
  await widget.getByRole("button").click();
  await widget.getByRole("button", { name: "Continuar" }).click();
  await widget.getByRole("button", { name: "Calcular cotação" }).click();
  await expect(
    widget.getByText("Mais valor para sua próxima compra."),
  ).toBeVisible();
  await widget.getByRole("button", { name: "Continuar" }).click();
  for (const [id, value] of Object.entries({
    name: "Cliente teste widget",
    email: "widget@example.com",
    phone: "11999999999",
    cpf: "52998224725",
    postal_code: "01001000",
    street: "Rua teste",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
  }))
    await widget.locator("#" + id).fill(value);
  await widget.getByRole("checkbox").check();
  await widget.getByRole("button", { name: "Confirmar trade-in" }).click();
  await expect(widget.getByText("Pronto para uma nova volta.")).toBeVisible();
  await expect(widget.getByText(/DEMO-POST-/)).toBeVisible();
});

test("regras editáveis e liberação PIX pós-inspeção", async ({ request }) => {
  await login(request);
  const rules = await (await request.get("/api/merchant/rules")).json();
  const rule = rules.find(
    (r: { criteria: string }) => r.criteria === "screen_intact",
  );
  expect(
    (
      await request.patch("/api/merchant/rules/" + rule.id, {
        headers,
        data: { deductionBps: 3500, version: rule.version },
      })
    ).status(),
  ).toBe(200);
  const quote = await (
    await request.post("/api/v1/quotes/calculate", {
      data: {
        store_id: "demo",
        device_id: "iphone13-128",
        condition: { ...condition, screen_intact: false },
      },
    })
  ).json();
  expect(quote.deductions[0].percentage).toBe(35);
  expect(
    (
      await request.patch("/api/merchant/rules/" + rule.id, {
        headers,
        data: { deductionBps: rule.deductionBps, version: rule.version + 1 },
      })
    ).status(),
  ).toBe(200);
  const initial = await (await request.get("/api/merchant/settings")).json();
  const { freightPayer, freightCents, marginBps, version } = initial;
  const changed = await request.patch("/api/merchant/settings", {
    headers,
    data: {
      freightPayer,
      freightCents,
      marginBps,
      version,
      mode: "post_inspection",
      payoutMethod: "pix",
    },
  });
  expect(changed.status()).toBe(200);
  try {
    const row = await receive(request, (await create(request)).id);
    const approved = await request.post(
      `/api/merchant/tradeins/${row.id}/inspection`,
      {
        headers,
        data: {
          version: row.version,
          decision: "approve",
          checklist: {
            powersOn: true,
            imeiMatches: true,
            conditionMatches: true,
          },
          notes: "",
        },
      },
    );
    expect(approved.status()).toBe(200);
    const result = await approved.json();
    expect(result.payoutReference).toMatch(/^DEMO-PIX-/);
    expect(result.couponCode).toBeNull();
  } finally {
    const current = await (await request.get("/api/merchant/settings")).json();
    expect(
      (
        await request.patch("/api/merchant/settings", {
          headers,
          data: {
            freightPayer,
            freightCents,
            marginBps,
            version: current.version,
            mode: initial.mode,
            payoutMethod: initial.payoutMethod,
          },
        })
      ).status(),
    ).toBe(200);
  }
});
test("cliente aceita ou recusa pela página da proposta e etiqueta pode ser visualizada", async ({
  page,
}) => {
  await login(page.request);
  for (const accept of [true, false]) {
    const row = await receive(page.request, (await create(page.request)).id);
    const offered = await page.request.post(
      `/api/merchant/tradeins/${row.id}/inspection`,
      {
        headers,
        data: {
          version: row.version,
          decision: "counteroffer",
          checklist: {
            powersOn: true,
            imeiMatches: true,
            conditionMatches: false,
          },
          notes: "Bateria abaixo da condição declarada",
          amountCents: 90000,
        },
      },
    );
    expect(offered.status()).toBe(200);
    const record = await detail(page.request, row.id);
    const url = record.events.find(
      (e: { type: string }) => e.type === "tradein.counteroffered",
    ).payload.acceptanceUrl;
    await page.goto(url);
    await expect(page.getByText("R$ 900,00", { exact: true })).toBeVisible();
    await page
      .getByRole("button", {
        name: accept ? "Aceitar proposta" : "Recusar e devolver",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText(
      accept ? "Proposta aceita!" : "Proposta recusada.",
    );
    const updated = await detail(page.request, row.id);
    expect(updated.status).toBe(accept ? "approved" : "rejected");
    if (!accept) {
      const label = await page.request.get(
        `/api/merchant/tradeins/${row.id}/return-label`,
      );
      expect(label.status()).toBe(200);
      expect(await label.text()).toContain("SEM VALIDADE POSTAL");
    }
  }
});
