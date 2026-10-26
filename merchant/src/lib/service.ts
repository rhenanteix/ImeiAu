import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import type { TradeStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  AppError,
  createSchema,
  inspectionSchema,
  pricing,
  quoteSchema,
} from "./domain";
import { z } from "zod";
import { checkImeiBlacklist } from "./imei";
import { generateReverseShippingAuthorization } from "./shipping-reverse";
type Tx = Prisma.TransactionClient;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const demoCode = (kind: string) =>
  `DEMO-${kind}-${randomUUID().slice(0, 8).toUpperCase()}`;
export async function quotation(
  input: z.infer<typeof quoteSchema>,
  tx: Tx = db,
) {
  const store = await tx.store.findUnique({
    where: { id: input.store_id },
    include: { rules: true },
  });
  const device = await tx.device.findFirst({
    where: { id: input.device_id, storeId: input.store_id, active: true },
  });
  if (!store || !device)
    throw new AppError(404, "Loja ou aparelho não encontrado");
  const value = pricing(
    device.basePriceCents,
    input.condition,
    store.rules,
    store,
  );
  return {
    ...value,
    device_id: device.id,
    preferred_mode: store.mode,
    allowed_modes:
      store.mode === "instant_coupon"
        ? ["instant_coupon", "post_inspection"]
        : ["post_inspection"],
    store,
  };
}
export function publicResult(row: {
  id: string;
  status: string;
  mode: string;
  estimatedCents: number;
  couponCode: string | null;
  shippingCode: string;
}) {
  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    estimated_value: row.estimatedCents,
    coupon_code: row.couponCode,
    shipping_code: row.shippingCode,
    currency: "BRL",
    simulated: true,
  };
}
async function event(
  tx: Tx,
  row: { id: string; storeId: string },
  type: string,
  payload: Prisma.InputJsonValue,
) {
  const trade = await tx.tradeIn.findUniqueOrThrow({
    where: { id: row.id },
    select: { customer: true },
  });
  const customer = trade.customer as { email: string; phone: string };
  const envelope = {
    ...(payload as Prisma.InputJsonObject),
    recipient: { email: customer.email, whatsapp: customer.phone },
  };
  return tx.outboxEvent.create({
    data: { storeId: row.storeId, tradeInId: row.id, type, payload: envelope },
  });
}
export async function createTrade(
  input: z.infer<typeof createSchema>,
  key: string,
) {
  const payloadHash = hash(JSON.stringify(input));
  const existing = await db.tradeIn.findUnique({
    where: {
      storeId_idempotencyKey: { storeId: input.store_id, idempotencyKey: key },
    },
  });
  if (existing) {
    if (existing.payloadHash !== payloadHash)
      throw new AppError(409, "Chave já utilizada com outros dados");
    return publicResult(existing);
  }

  // Validate eligibility before consuming a paid IMEI lookup.
  const eligibility = await quotation(input);
  if (
    !eligibility.allowed_modes.includes(input.mode) ||
    eligibility.estimated_value <= 0
  )
    throw new AppError(
      422,
      "Aparelho ou modalidade não elegível para esta troca",
    );
  const imeiCheck = input.imei ? await checkImeiBlacklist(input.imei) : null;
  if (imeiCheck) {
    if (imeiCheck.blocked || !imeiCheck.valid) {
      throw new AppError(422, imeiCheck.reason || "IMEI inválido ou bloqueado");
    }
  }

  try {
    return await db.$transaction(async (tx) => {
      const quote = await quotation(input, tx);
      if (!quote.allowed_modes.includes(input.mode))
        throw new AppError(422, "Modalidade não permitida");
      if (quote.estimated_value <= 0)
        throw new AppError(422, "Aparelho sem valor elegível");
      const { store, ...snapshot } = quote;
      const instant = input.mode === "instant_coupon";

      const tradeId = randomUUID();
      // Generate reverse shipping authorization
      const reverseShipping = await generateReverseShippingAuthorization({
        tradeInId: tradeId,
        storeId: store.id,
        customer: input.customer,
      });

      const row = await tx.tradeIn.create({
        data: {
          id: tradeId,
          storeId: store.id,
          deviceId: input.device_id,
          customer: input.customer,
          condition: input.condition,
          pricingSnapshot: snapshot,
          estimatedCents: quote.estimated_value,
          mode: input.mode,
          payoutMethod: store.payoutMethod,
          idempotencyKey: key,
          payloadHash,
          shippingCode: demoCode("POST"),
          couponCode: instant ? demoCode("CUPOM") : null,
          preauthorizationRef: instant ? demoCode("PREAUTH") : null,
          preauthorizationStatus: instant ? "authorized" : null,
          imei: input.imei || null,
          imeiChecked: imeiCheck?.details?.blacklistChecked === true,
          imeiBlocked: imeiCheck?.blocked ?? false,
          imeiCheckResult: imeiCheck
            ? ({ ...imeiCheck } as Prisma.InputJsonObject)
            : Prisma.DbNull,
          reverseAuthorizationCode: reverseShipping.authorizationCode,
          reverseLabelUrl: reverseShipping.labelPdfUrl,
          logisticsProvider: reverseShipping.provider,
          trackingCode: reverseShipping.trackingCode,
          carrier: reverseShipping.carrier,
        },
      });
      await event(tx, row, "tradein.created", {
        simulated: true,
        mode: row.mode,
        amountCents: row.estimatedCents,
        preauthorizationRef: row.preauthorizationRef,
        shippingCode: row.shippingCode,
        couponCode: row.couponCode,
        reverseAuthorizationCode: row.reverseAuthorizationCode,
        reverseLabelUrl: row.reverseLabelUrl,
      });
      return publicResult(row);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const row = await db.tradeIn.findUnique({
        where: {
          storeId_idempotencyKey: {
            storeId: input.store_id,
            idempotencyKey: key,
          },
        },
      });
      if (row && row.payloadHash === payloadHash) return publicResult(row);
      throw new AppError(409, "Chave já utilizada");
    }
    throw error;
  }
}
async function lockTrade(
  tx: Tx,
  id: string,
  storeId: string,
  version: number,
  status: TradeStatus,
) {
  const lock = await tx.tradeIn.updateMany({
    where: { id, storeId, version, status },
    data: { version: { increment: 1 } },
  });
  if (lock.count !== 1)
    throw new AppError(
      409,
      "Solicitação alterada ou em etapa incompatível. Atualize a tela.",
    );
  return tx.tradeIn.findUniqueOrThrow({ where: { id } });
}
async function settle(
  tx: Tx,
  row: Awaited<ReturnType<typeof lockTrade>>,
  amount: number,
) {
  const updated = await tx.tradeIn.update({
    where: { id: row.id },
    data: {
      status: "approved",
      finalCents: amount,
      couponCode:
        row.payoutMethod === "coupon"
          ? amount === row.estimatedCents && row.couponCode
            ? row.couponCode
            : demoCode("CUPOM")
          : null,
      payoutReference: row.payoutMethod === "pix" ? demoCode("PIX") : null,
      preauthorizationStatus: row.preauthorizationRef ? "released" : null,
    },
  });
  await event(tx, row, "tradein.approved", {
    simulated: true,
    amountCents: amount,
    method: row.payoutMethod,
    couponCode: updated.couponCode,
    payoutReference: updated.payoutReference,
    previousCouponCode: row.couponCode,
    action: "release_reward_and_notify_customer",
  });
  return updated;
}
async function reject(
  tx: Tx,
  row: Awaited<ReturnType<typeof lockTrade>>,
  reason: string,
) {
  const updated = await tx.tradeIn.update({
    where: { id: row.id },
    data: {
      status: "rejected",
      couponCode: null,
      returnShippingCode: demoCode("RETURN"),
      preauthorizationStatus: row.preauthorizationRef ? "released" : null,
    },
  });
  await event(tx, row, "tradein.rejected", {
    simulated: true,
    reason,
    returnShippingCode: updated.returnShippingCode,
    revokeCoupon: row.couponCode,
    action: "return_device_cancel_and_notify_customer",
  });
  return updated;
}
export async function inspect(
  storeId: string,
  actorId: string,
  id: string,
  input: z.infer<typeof inspectionSchema>,
) {
  return db.$transaction(async (tx) => {
    const row = await lockTrade(tx, id, storeId, input.version, "inspecting");
    await tx.inspection.create({
      data: {
        tradeInId: id,
        actorId,
        ...input.checklist,
        notes: input.notes,
        decision: input.decision,
      },
    });
    if (input.decision === "approve")
      return settle(tx, row, row.estimatedCents);
    if (input.decision === "reject") return reject(tx, row, input.notes);
    if (input.amountCents! >= row.estimatedCents)
      throw new AppError(
        422,
        "Contraproposta deve ser menor que a cotação original",
      );
    const token = randomBytes(32).toString("hex");
    const offer = await tx.counteroffer.create({
      data: {
        tradeInId: id,
        amountCents: input.amountCents!,
        reason: input.notes,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await tx.tradeIn.update({
      where: { id },
      data: { status: "counteroffered", couponCode: null },
    });
    await event(tx, row, "tradein.counteroffered", {
      simulated: true,
      offerId: offer.id,
      amountCents: offer.amountCents,
      reason: offer.reason,
      acceptanceUrl: `${process.env.BETTER_AUTH_URL}/offer#${token}`,
      channels: ["email", "whatsapp"],
      revokeCoupon: row.couponCode,
      action: "notify_customer_for_consent",
    });
    return tx.tradeIn.findUniqueOrThrow({ where: { id } });
  });
}
export async function getOffer(token: string) {
  const offer = await db.counteroffer.findUnique({
    where: { tokenHash: hash(token) },
    include: { tradeIn: { include: { device: true } } },
  });
  if (!offer) throw new AppError(404, "Proposta não encontrada");
  return offer;
}
export async function respondOffer(token: string, accept: boolean) {
  return db.$transaction(async (tx) => {
    const offer = await tx.counteroffer.findUnique({
      where: { tokenHash: hash(token) },
    });
    if (!offer) throw new AppError(404, "Proposta não encontrada");
    if (offer.respondedAt)
      throw new AppError(409, "Esta proposta já foi respondida");
    if (offer.expiresAt < new Date())
      throw new AppError(410, "Proposta expirada. Contate a loja.");
    const claim = await tx.counteroffer.updateMany({
      where: { id: offer.id, respondedAt: null },
      data: { respondedAt: new Date(), accepted: accept },
    });
    if (claim.count !== 1) throw new AppError(409, "Proposta já respondida");
    const row = await tx.tradeIn.findUniqueOrThrow({
      where: { id: offer.tradeInId },
    });
    await lockTrade(tx, row.id, row.storeId, row.version, "counteroffered");
    const result = accept
      ? await settle(tx, row, offer.amountCents)
      : await reject(tx, row, "Contraproposta recusada pelo cliente");
    return {
      status: result.status,
      finalCents: result.finalCents,
      couponCode: result.couponCode,
      returnShippingCode: result.returnShippingCode,
      simulated: true,
    };
  });
}
