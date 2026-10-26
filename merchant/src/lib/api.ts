import { checkImeiBlacklist } from "./imei";
import { generatePresignedUploadUrl } from "./storage";
import { getShippingLabelPdf } from "./shipping-reverse";
import { returnLabel } from "./shipping-label";
import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "./auth";
import { db } from "./db";
import {
  AppError,
  settingsSchema,
  deviceSchema,
  ruleSchema,
  quoteSchema,
  createSchema,
  inspectionSchema,
  statusLabels,
} from "./domain";
import {
  quotation,
  createTrade,
  inspect,
  getOffer,
  respondOffer,
} from "./service";
import { dispatchEvents } from "./outbox";
import { B2BMatchingEngine } from "./b2b/matching";
import { PaymentSplitService } from "./b2b/payment-split";
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "JSON inválido");
  }
}
export async function merchantContext(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw new AppError(401, "Entre na sua conta");
  const member = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { store: true },
  });
  if (!member) throw new AppError(403, "Conta sem loja vinculada");
  if (!["owner", "technician"].includes(member.role))
    throw new AppError(403, "Acesso não permitido");
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (
      req.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin
    )
      throw new AppError(403, "Origem não permitida");
  }
  return { store: member.store, user: session.user, role: member.role };
}
async function route(req: NextRequest, path: string[]) {
  const key = path.join("/"),
    method = req.method;
  if (key.startsWith("v1/")) {
    if (key === "v1/devices" && method === "GET") {
      const store = await db.store.findUnique({
        where: { id: req.nextUrl.searchParams.get("store_id") || "" },
        include: {
          devices: {
            where: { active: true },
            orderBy: [{ brand: "asc" }, { model: "asc" }, { storage: "asc" }],
          },
        },
      });
      if (!store) throw new AppError(404, "Loja não encontrada");
      const brands: Record<
        string,
        Record<string, { id: string; storage: string }[]>
      > = Object.create(null);
      for (const d of store.devices) {
        brands[d.brand] ??= Object.create(null);
        brands[d.brand][d.model] ??= [];
        brands[d.brand][d.model].push({ id: d.id, storage: d.storage });
      }
      return json({ brands, mode_preference: store.mode });
    }
    if (key === "v1/quotes/calculate" && method === "POST") {
      const { store, ...value } = await quotation(
        quoteSchema.parse(await body(req)),
      );
      void store;
      return json(value);
    }
    if (key === "v1/imei/validate" && method === "POST") {
      await merchantContext(req);
      const input = z
        .object({ imei: z.string().min(1) })
        .strict()
        .parse(await body(req));
      const result = await checkImeiBlacklist(input.imei);
      if (result.blocked) {
        throw new AppError(422, result.reason || "IMEI bloqueado");
      }
      return json(result);
    }
    if (key === "v1/tradein/create" && method === "POST") {
      const input = createSchema.parse(await body(req));
      const idempotency = z
        .string()
        .min(8)
        .max(100)
        .parse(req.headers.get("idempotency-key"));
      const result = await createTrade(input, idempotency);
      after(() => dispatchEvents(input.store_id));
      return json(result, 201);
    }
    if (key === "v1/leads" && method === "POST") {
      const input = z
        .object({
          name: z.string().min(3).max(120),
          store_name: z.string().min(2).max(120),
          email: z.email(),
          whatsapp: z.string().regex(/^\d{10,13}$/),
          platform: z.enum(["Shopify", "Nuvemshop", "WooCommerce", "Outra"]),
          consent: z.literal(true),
        })
        .strict()
        .parse(await body(req));
      await db.lead.upsert({
        where: { email: input.email },
        create: { email: input.email, data: input },
        update: {},
      });
      return json({ message: "Você está na lista!" }, 201);
    }
    if (key === "v1/uploads/presign" && method === "POST") {
      const input = z
        .object({
          tradeInId: z.string().min(1),
          fileName: z.string().min(1),
          contentType: z.string().min(1),
          photoType: z.enum(["screen_on", "back", "side"]),
        })
        .strict()
        .parse(await body(req));
      const result = await generatePresignedUploadUrl(input);
      return json(result);
    }
    if (key === "v1/uploads/confirm" && method === "POST") {
      const input = z
        .object({
          tradeInId: z.string().min(1),
          photos: z.object({
            screen_on: z.string().url().optional(),
            back: z.string().url().optional(),
            side: z.string().url().optional(),
          }),
        })
        .strict()
        .parse(await body(req));
      await db.tradeIn.update({
        where: { id: input.tradeInId },
        data: { photos: input.photos },
      });
      return json({ success: true, photos: input.photos });
    }
    if (key === "v1/webhooks/shipping-status" && method === "POST") {
      const input = z
        .object({
          trackingCode: z.string().min(1),
          status: z.enum(["POSTADO", "EM_TRANSITO", "ENTREGUE", "DEVOLVIDO"]),
          carrier: z.string().optional(),
          occurredAt: z.string().optional(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
        .strict()
        .parse(await body(req));
      
      const tradeIn = await db.tradeIn.findFirst({
        where: { trackingCode: input.trackingCode },
      });
      
      if (!tradeIn) {
        throw new AppError(404, "Rastreamento não encontrado");
      }
      
      // Map carrier status to internal status
      if (input.status === "POSTADO" || input.status === "EM_TRANSITO") {
        if (tradeIn.status === "pending_shipping") {
          await db.tradeIn.update({
            where: { id: tradeIn.id },
            data: { status: "shipped", webhookLastEvent: input },
          });
          // Notify merchant - in production would send notification
          await db.outboxEvent.create({
            data: {
              storeId: tradeIn.storeId,
              tradeInId: tradeIn.id,
              type: "shipping.posted",
              payload: {
                simulated: true,
                trackingCode: input.trackingCode,
                status: input.status,
                message: "Pacote em trânsito - lojista notificado",
              },
            },
          });
        }
      } else if (input.status === "ENTREGUE") {
        await db.tradeIn.update({
          where: { id: tradeIn.id },
          data: { status: "inspecting", webhookLastEvent: input },
        });
        // Alert WhatsApp technician and move to "Pronto para Vistoria"
        await db.outboxEvent.create({
          data: {
            storeId: tradeIn.storeId,
            tradeInId: tradeIn.id,
            type: "shipping.delivered",
            payload: {
              simulated: true,
              trackingCode: input.trackingCode,
              status: input.status,
              message: "Pacote entregue - Pronto para Vistoria",
              alert: "whatsapp_technician",
            },
          },
        });
      }
      
      return json({ success: true, tradeInId: tradeIn.id, status: tradeIn.status });
    }
    if (key.startsWith("v1/shipping/label/") && method === "GET") {
      const authCode = path[path.length - 1].replace(".pdf", "");
      const pdfBuffer = await getShippingLabelPdf(authCode);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="etiqueta-${authCode}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }
  }
  // B2B Routes
    if (key.startsWith("b2b/")) {
      if (key === "b2b/buyer/register" && method === "POST") {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) throw new AppError(401, "Entre na sua conta");
        const input = z
          .object({
            companyName: z.string().min(3).max(200),
            cnpj: z.string().optional(),
            contactName: z.string().min(3).max(120),
            contactPhone: z.string().regex(/^\d{10,13}$/),
            address: z
              .object({
                postal_code: z.string().regex(/^\d{8}$/),
                street: z.string().min(3).max(150),
                number: z.string().min(1).max(15),
                complement: z.string().max(100).optional(),
                neighborhood: z.string().min(2).max(100),
                city: z.string().min(2).max(100),
                state: z.string().regex(/^[A-Z]{2}$/),
              })
              .optional(),
          })
          .strict()
          .parse(await body(req));
        const buyer = await db.b2BBuyer.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            ...input,
            status: "pending_kyc",
          },
          update: {
            ...input,
          },
        });
        return json({ buyer, message: "Cadastro enviado para análise KYC" }, 201);
      }
      if (key === "b2b/offers" && method === "POST") {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) throw new AppError(401, "Entre na sua conta");
        const buyer = await db.b2BBuyer.findUnique({
          where: { userId: session.user.id },
        });
        if (!buyer) throw new AppError(403, "Cadastre-se como comprador B2B");
        if (buyer.status !== "approved")
          throw new AppError(403, "Conta B2B não aprovada");
        const input = z
          .object({
            brand: z.string().min(1).max(60),
            model: z.string().min(1).max(100),
            storage: z.string().optional(),
            conditionCriteria: z.object({
              require_powers_on: z.boolean().optional(),
              require_screen_intact: z.boolean().optional(),
              require_battery_ok: z.boolean().optional(),
            }),
            maxPriceCents: z.number().int().min(0),
            minQuantity: z.number().int().min(1).default(1),
            expiresAt: z.string().datetime().optional(),
          })
          .strict()
          .parse(await body(req));
        const offer = await db.b2BOffer.create({
          data: {
            buyerId: buyer.id,
            ...input,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          },
        });
        return json({ offer }, 201);
      }
      if (key === "b2b/offers" && method === "GET") {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) throw new AppError(401, "Entre na sua conta");
        const buyer = await db.b2BBuyer.findUnique({
          where: { userId: session.user.id },
        });
        if (!buyer) throw new AppError(403, "Cadastre-se como comprador B2B");
        const offers = await db.b2BOffer.findMany({
          where: { buyerId: buyer.id },
          orderBy: { createdAt: "desc" },
        });
        return json({ offers });
      }
      if (key === "b2b/matching/auto" && method === "POST") {
        const results = await B2BMatchingEngine.autoMatchApproved();
        return json({ matched: results.length, results });
      }
      if (key === "b2b/payment/create" && method === "POST") {
        const input = z
          .object({ lotId: z.string().min(1) })
          .strict()
          .parse(await body(req));
        const payment = await PaymentSplitService.createLotPayment(input.lotId);
        return json(payment);
      }
      if (key === "b2b/payment/webhook" && method === "POST") {
        const input = z
          .object({
            paymentIntentId: z.string().min(1),
            status: z.enum(["paid", "failed"]),
            chargeId: z.string().optional(),
          })
          .strict()
          .parse(await body(req));
        const result = await PaymentSplitService.processPaymentWebhook(input);
        return json(result);
      }
      throw new AppError(404, "Endpoint não encontrado");
    }
  if (key.startsWith("v1/shipping/label/") && method === "GET") {
    const authCode = path[path.length - 1].replace(".pdf", "");
    const pdfBuffer = await getShippingLabelPdf(authCode);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="etiqueta-${authCode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (key === "offers/respond" && method === "POST") {
    const data = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        accept: z.boolean(),
      })
      .strict()
      .parse(await body(req));
    const result = await respondOffer(data.token, data.accept);
    after(() => dispatchEvents());
    return json(result);
  }
  if (key === "offers/view" && method === "POST") {
    const { token } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(await body(req));
    const offer = await getOffer(token);
    return json({
      amountCents: offer.amountCents,
      reason: offer.reason,
      expiresAt: offer.expiresAt,
      respondedAt: offer.respondedAt,
      accepted: offer.accepted,
      device: `${offer.tradeIn.device.model} ${offer.tradeIn.device.storage}`,
      simulated: true,
    });
  }
  if (path[0] !== "merchant")
    throw new AppError(404, "Endpoint não encontrado");
  const { store, user, role } = await merchantContext(req);
  const storeId = store.id;
  const owner = () => {
    if (role !== "owner")
      throw new AppError(
        403,
        "Apenas o responsável da loja pode alterar esta configuração",
      );
  };
  if (key === "merchant/me" && method === "GET")
    return json({
      store,
      user: { name: user.name, email: user.email },
      role,
      integrationMode: process.env.INTEGRATION_MODE || "mock",
    });
  if (key === "merchant/settings") {
    if (method === "GET") return json(store);
    if (method === "PATCH") {
      owner();
      const { version, ...data } = settingsSchema.parse(await body(req));
      const result = await db.store.updateMany({
        where: { id: storeId, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!result.count)
        throw new AppError(409, "Configuração alterada. Atualize a tela.");
      return json(await db.store.findUnique({ where: { id: storeId } }));
    }
  }
  if (path[1] === "devices") {
    if (path.length === 2 && method === "GET") {
      const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 100);
      return json(
        await db.device.findMany({
          where: {
            storeId,
            OR: ["brand", "model", "storage"].map((field) => ({
              [field]: { contains: q, mode: "insensitive" },
            })),
          },
          orderBy: [{ brand: "asc" }, { model: "asc" }],
        }),
      );
    }
    owner();
    if (path.length === 2 && method === "POST")
      return json(
        await db.device.create({
          data: { ...deviceSchema.parse(await body(req)), storeId },
        }),
        201,
      );
    if (path.length === 3 && (method === "PATCH" || method === "DELETE")) {
      const input =
        method === "PATCH"
          ? deviceSchema
              .extend({ version: z.number().int().min(0) })
              .parse(await body(req))
          : z
              .object({ version: z.number().int().min(0) })
              .strict()
              .parse(await body(req));
      const { version, ...changes } = input;
      const result = await db.device.updateMany({
        where: { id: path[2], storeId, version },
        data: {
          ...(method === "DELETE" ? { active: false } : changes),
          version: { increment: 1 },
        },
      });
      if (!result.count)
        throw new AppError(409, "Aparelho não encontrado ou alterado");
      return json(
        await db.device.findFirst({ where: { id: path[2], storeId } }),
      );
    }
  }
  if (key === "merchant/rules" && method === "GET")
    return json(
      await db.conditionRule.findMany({
        where: { storeId },
        orderBy: { criteria: "asc" },
      }),
    );
  if (path[1] === "rules" && path.length === 3 && method === "PATCH") {
    owner();
    const { version, ...data } = ruleSchema.parse(await body(req));
    const result = await db.conditionRule.updateMany({
      where: { id: path[2], storeId, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (!result.count)
      throw new AppError(409, "Regra alterada. Atualize a tela.");
    return json({ ok: true });
  }
  if (key === "merchant/tradeins" && method === "GET") {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    if (status && !Object.hasOwn(statusLabels, status))
      throw new AppError(422, "Status inválido");
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(req.nextUrl.searchParams.get("page") || 1);
    const where = {
      storeId,
      ...(status ? { status: status as keyof typeof statusLabels } : {}),
    };
    const [items, total, counts] = await Promise.all([
      db.tradeIn.findMany({
        where,
        include: { device: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: (page - 1) * 20,
      }),
      db.tradeIn.count({ where }),
      db.tradeIn.groupBy({ by: ["status"], where: { storeId }, _count: true }),
    ]);
    return json({
      items: items.map(({ customer, ...row }) => ({
        ...row,
        customerName: (customer as { name: string }).name,
      })),
      total,
      page,
      counts,
    });
  }
  if (path[1] === "tradeins" && path.length >= 3) {
    const row = await db.tradeIn.findFirst({
      where: { id: path[2], storeId },
      include: {
        device: true,
        inspections: { orderBy: { createdAt: "desc" } },
        counteroffers: true,
        events: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!row) throw new AppError(404, "Solicitação não encontrada");
    if (path.length === 3 && method === "GET") return json(row);
    if (path[3] === "return-label" && method === "GET") {
      if (!row.returnShippingCode || row.status !== "rejected")
        throw new AppError(409, "Nenhuma devolução gerada");
      return new NextResponse(
        returnLabel(
          row.returnShippingCode,
          row.customer as { name: string; address: Record<string, string> },
          store.name,
        ),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
          },
        },
      );
    }

    if (path[3] === "status" && method === "PATCH") {
      const input = z
        .object({
          status: z.enum(["shipped", "inspecting", "reopen_inspection"]),
          version: z.number().int().min(0),
        })
        .strict()
        .parse(await body(req));
      const expected =
        input.status === "shipped"
          ? "pending_shipping"
          : input.status === "inspecting"
            ? "shipped"
            : "counteroffered";
      if (input.status === "reopen_inspection") {
        // Expired counteroffers return to inspection so the technician can reject with a recorded reason.
        const offer = row.counteroffers.at(-1);
        if (!offer || offer.expiresAt > new Date())
          throw new AppError(
            409,
            "Aguarde o cliente responder ou a proposta expirar",
          );
      }
      const updated = await db.tradeIn.updateMany({
        where: {
          id: row.id,
          storeId,
          version: input.version,
          status: expected,
        },
        data: {
          status:
            input.status === "reopen_inspection" ? "inspecting" : input.status,
          version: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new AppError(409, "Transição inválida ou solicitação alterada");
      return json({ ok: true });
    }
    if (path[3] === "inspection" && method === "POST") {
      const result = await inspect(
        storeId,
        user.id,
        row.id,
        inspectionSchema.parse(await body(req)),
      );
      after(() => dispatchEvents(storeId));
      return json(result);
    }
  }
  if (key === "merchant/events" && method === "GET")
    return json(
      await db.outboxEvent.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  if (key === "merchant/events/retry" && method === "POST") {
    owner();
    await db.outboxEvent.updateMany({
      where: { storeId, status: "failed" },
      data: { availableAt: new Date() },
    });
    after(() => dispatchEvents(storeId));
    return json({ ok: true });
  }
  throw new AppError(404, "Endpoint não encontrado");
}
export async function handle(
  req: NextRequest,
  context: { params: Promise<object> },
) {
  let response: NextResponse;
  try {
    await context.params;
    response = await route(req, req.nextUrl.pathname.replace(/^\/api\//, "").split("/"));
  } catch (error) {
    if (error instanceof AppError)
      response = json({ detail: error.message }, error.status);
    else if (error instanceof z.ZodError)
      response = json(
        { detail: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        422,
      );
    else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      response = json({ detail: "Já existe um registro com estes dados" }, 409);
    else {
      console.error(
        "API error",
        error instanceof Error ? error.name : "unknown",
      );
      response = json({ detail: "Não foi possível concluir a operação" }, 500);
    }
  }
  const origin = req.headers.get("origin");
  if (
    req.nextUrl.pathname.startsWith("/api/v1/") &&
    origin &&
    (process.env.ALLOWED_ORIGINS || "").split(",").includes(origin)
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}
