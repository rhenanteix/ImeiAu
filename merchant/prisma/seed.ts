import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";

// Credenciais de teste — altere para o seu email/senha
const TEST_EMAIL = "admin@volta.com.br";
const TEST_PASSWORD = "Volta@2024!";

const user = await db.user.upsert({
  where: { email: TEST_EMAIL },
  update: {},
  create: {
    id: randomUUID(),
    name: "Administrador",
    email: TEST_EMAIL,
    emailVerified: true,
  },
});

if (
  !(await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  }))
)
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await hashPassword(TEST_PASSWORD),
    },
  });
for (const [id, name, mode] of [
  ["demo", "Loja demonstração", "instant_coupon"],
  ["demo-inspection", "Loja inspeção", "post_inspection"],
] as const) {
  await db.store.upsert({
    where: { id },
    update: {},
    create: {
      id,
      name,
      domain: id === "demo" ? "localhost" : "inspection.localhost",
      platform: "Shopify",
      mode,
    },
  });
  if (id === "demo")
    await db.membership.upsert({
      where: { userId_storeId: { userId: user.id, storeId: id } },
      update: {},
      create: { userId: user.id, storeId: id, role: "owner" },
    });
  for (const [suffix, brand, model, storage, basePriceCents] of [
    ["iphone13-128", "Apple", "iPhone 13", "128GB", 180000],
    ["iphone13-256", "Apple", "iPhone 13", "256GB", 205000],
    ["iphone14-128", "Apple", "iPhone 14", "128GB", 230000],
    ["s23-128", "Samsung", "Galaxy S23", "128GB", 165000],
  ] as const) {
    const deviceId = id === "demo" ? suffix : `${id}-${suffix}`;
    await db.device.upsert({
      where: { id: deviceId },
      update: {},
      create: {
        id: deviceId,
        storeId: id,
        brand,
        model,
        storage,
        basePriceCents,
      },
    });
  }
  for (const [criteria, label, deductionBps] of [
    ["powers_on", "Aparelho não liga", 6000],
    ["screen_intact", "Tela trincada ou não funcional", 3000],
    ["battery_ok", "Bateria abaixo de 80%", 1500],
  ] as const)
    await db.conditionRule.upsert({
      where: { storeId_criteria: { storeId: id, criteria } },
      update: {},
      create: { storeId: id, criteria, label, deductionBps },
    });
}
console.log("Lojas, catálogo e usuário configurados.");
console.log("Credenciais de teste:");
console.log("  Email:    " + TEST_EMAIL);
console.log("  Senha:    " + TEST_PASSWORD);
await db.$disconnect();
