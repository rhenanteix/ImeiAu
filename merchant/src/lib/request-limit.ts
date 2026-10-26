import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";
import { AppError } from "./domain";

// Atomic fixed window; stores only a digest of the caller's identity.
export async function requestLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  const now = BigInt(Date.now());
  const cutoff = now - BigInt(windowMs);
  const key = `imeiau:${scope}:${createHash("sha256").update(identity).digest("hex")}`;
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest") VALUES (${randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."lastRequest" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "RateLimit"."lastRequest" < ${cutoff} THEN ${now} ELSE "RateLimit"."lastRequest" END
    RETURNING "count"
  `;
  if (rows[0].count > limit)
    throw new AppError(
      429,
      "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
    );
}
