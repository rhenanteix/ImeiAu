import { z } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const conditionSchema = z
  .object({
    powers_on: z.boolean(),
    screen_intact: z.boolean(),
    battery_ok: z.boolean(),
  })
  .strict();
const cents = z.number().int().min(0).max(100_000_000);
export const settingsSchema = z
  .object({
    mode: z.enum(["instant_coupon", "post_inspection"]),
    freightPayer: z.enum(["store", "customer"]),
    freightCents: cents,
    marginBps: z.number().int().min(0).max(10000),
    payoutMethod: z.enum(["coupon", "pix"]),
    version: z.number().int().min(0),
  })
  .strict()
  .refine(
    (v) => v.mode !== "instant_coupon" || v.payoutMethod === "coupon",
    "Modo instantâneo exige pagamento por cupom",
  );
export const deviceSchema = z
  .object({
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(100),
    storage: z.string().trim().min(1).max(30),
    basePriceCents: cents.min(1),
    active: z.boolean().default(true),
  })
  .strict();
export const ruleSchema = z
  .object({
    deductionBps: z.number().int().min(0).max(10000),
    version: z.number().int().min(0),
  })
  .strict();
export const inspectionSchema = z
  .object({
    version: z.number().int().min(0),
    decision: z.enum(["approve", "counteroffer", "reject"]),
    checklist: z
      .object({
        powersOn: z.boolean(),
        imeiMatches: z.boolean(),
        conditionMatches: z.boolean(),
      })
      .strict(),
    notes: z.string().trim().max(2000),
    amountCents: cents.min(1).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.decision === "approve" && !Object.values(v.checklist).every(Boolean))
      ctx.addIssue({
        code: "custom",
        message: "A aprovação exige todos os itens do checklist confirmados",
      });
    if (v.decision !== "approve" && v.notes.length < 10)
      ctx.addIssue({
        code: "custom",
        message: "Informe o motivo com pelo menos 10 caracteres",
      });
    if (v.decision === "counteroffer" && !v.amountCents)
      ctx.addIssue({
        code: "custom",
        message: "Informe o valor da contraproposta",
      });
  });
export const quoteSchema = z
  .object({
    store_id: z.string().min(1).max(100),
    device_id: z.string().min(1).max(100),
    condition: conditionSchema,
  })
  .strict();
function cpfValid(value: string) {
  if (!/^\d{11}$/.test(value) || new Set(value).size === 1) return false;
  return [9, 10].every(
    (size) =>
      ((Array.from(value.slice(0, size)).reduce(
        (sum, n, i) => sum + Number(n) * (size + 1 - i),
        0,
      ) *
        10) %
        11) %
        10 ===
      Number(value[size]),
  );
}
export const createSchema = quoteSchema
  .extend({
    mode: z.enum(["instant_coupon", "post_inspection"]),
    consent: z.literal(true),
    imei: z.string().regex(/^\d{15}$/).optional(),
    photos: z
      .object({
        screen_on: z.string().url().optional(),
        back: z.string().url().optional(),
        side: z.string().url().optional(),
      })
      .optional(),
    customer: z
      .object({
        name: z.string().trim().min(3).max(120),
        email: z.email().max(255),
        phone: z.string().regex(/^\d{10,13}$/),
        cpf: z.string().refine(cpfValid, "CPF inválido"),
        address: z
          .object({
            postal_code: z.string().regex(/^\d{8}$/),
            street: z.string().min(3).max(150),
            number: z.string().min(1).max(15),
            complement: z.string().max(100).default(""),
            neighborhood: z.string().min(2).max(100),
            city: z.string().min(2).max(100),
            state: z.string().regex(/^[A-Z]{2}$/),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
export function pricing(
  basePriceCents: number,
  condition: Record<string, boolean>,
  rules: { criteria: string; deductionBps: number }[],
  settings: { marginBps: number; freightPayer: string; freightCents: number },
) {
  const deductions = rules.filter((r) => condition[r.criteria] === false);
  const deductionBps = Math.min(
    10000,
    deductions.reduce((sum, r) => sum + r.deductionBps, 0),
  );
  const conditionValue = Math.round(
    (basePriceCents * (10000 - deductionBps)) / 10000,
  );
  const marginCents = Math.round((conditionValue * settings.marginBps) / 10000);
  const freightCents =
    settings.freightPayer === "customer" ? settings.freightCents : 0;
  return {
    base_price: basePriceCents,
    deductions: deductions.map((r) => ({
      criteria: r.criteria,
      percentage: r.deductionBps / 100,
    })),
    margin_cents: marginCents,
    freight_cents: freightCents,
    estimated_value: Math.max(0, conditionValue - marginCents - freightCents),
    currency: "BRL",
  };
}
export const statusLabels = {
  pending_shipping: "Pendente de envio",
  shipped: "Em trânsito",
  inspecting: "Em inspeção",
  counteroffered: "Contraproposta",
  approved: "Aprovado",
  rejected: "Rejeitado",
};
export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
