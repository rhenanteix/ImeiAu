import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "./domain";
import { fetchImeiReport } from "./imei-provider";
export interface ImeiValidationResult {
  valid: boolean;
  isLuhnValid: boolean;
  blocked: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export function validateImeiFormatAndLuhn(imei: string): ImeiValidationResult {
  const cleaned = imei.replace(/\D/g, "");
  if (cleaned.length !== 15 || new Set(cleaned).size === 1) {
    return {
      valid: false,
      isLuhnValid: false,
      blocked: false,
      reason: "IMEI deve conter 15 dígitos",
    };
  }

  const digits = cleaned.split("").map((d) => parseInt(d, 10));
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = digits[i];
    if ((i + 1) % 2 === 0) {
      digit = digit * 2;
      if (digit > 9) digit = digit - 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const isLuhnValid = checkDigit === digits[14];

  if (!isLuhnValid) {
    return {
      valid: false,
      isLuhnValid: false,
      blocked: false,
      reason: "IMEI com dígito verificador inválido (algoritmo Luhn)",
    };
  }

  return {
    valid: true,
    isLuhnValid: true,
    blocked: false,
  };
}

export async function checkImeiBlacklist(
  imei: string,
): Promise<ImeiValidationResult> {
  const formatCheck = validateImeiFormatAndLuhn(imei);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  const apiKey = process.env.IMEI_INFO_API_KEY;
  if (!apiKey)
    return {
      ...formatCheck,
      details: {
        source: "local_format_validation",
        status: "not_checked",
        blacklistChecked: false,
      },
    };
  const serviceId = process.env.IMEI_INFO_SERVICE_ID || "";
  if (!/^\d+$/.test(serviceId))
    throw new AppError(
      503,
      "O serviço de consulta de IMEI ainda não está configurado.",
    );
  const cleaned = imei.replace(/\D/g, "");
  const { db } = await import("./db");
  const { requestLimit } = await import("./request-limit");
  const statusField = process.env.IMEI_INFO_STATUS_FIELD || "blacklist_status";
  const id = createHash("sha256")
    .update(`${serviceId}:${statusField}:${cleaned}`)
    .digest("hex");
  const now = new Date();
  const entry = await db.imeiLookup.upsert({
    where: { id },
    create: { id, expiresAt: now, lockedUntil: new Date(0) },
    update: {},
  });
  if (entry.result && entry.expiresAt > now)
    return entry.result as unknown as ImeiValidationResult;
  const claim = await db.imeiLookup.updateMany({
    where: { id, lockedUntil: { lte: now } },
    data: { lockedUntil: new Date(Date.now() + 20000) },
  });
  if (!claim.count)
    throw new AppError(
      409,
      "Este IMEI já está em consulta. Aguarde alguns instantes e tente novamente.",
    );
  try {
    await requestLimit("imei-provider", "global", 60, 3600000);
    // Resume a queued check by history ID, without paying for a new request.
    const reply = await fetchImeiReport(cleaned, {
      apiKey,
      serviceId,
      statusField,
      historyId: entry.result ? undefined : entry.historyId || undefined,
    });
    if (!reply.result) {
      await db.imeiLookup.update({
        where: { id },
        data: {
          historyId: reply.historyId,
          result: Prisma.DbNull,
          expiresAt: new Date(),
          lockedUntil: new Date(Date.now() + 5000),
        },
      });
      throw new AppError(
        409,
        "A IMEI.info está processando a consulta. Aguarde alguns instantes e confirme novamente.",
      );
    }
    await db.imeiLookup.update({
      where: { id },
      data: {
        historyId: reply.historyId || null,
        result: reply.result as unknown as Prisma.InputJsonObject,
        expiresAt: new Date(Date.now() + 15 * 60000),
        lockedUntil: new Date(0),
      },
    });
    return reply.result;
  } catch (error) {
    // A short lease also prevents rapid repeated attempts on upstream failures.
    throw error;
  }
}
