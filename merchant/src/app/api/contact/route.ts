import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/domain";
import { contactSchema, CONTACT_RECIPIENTS } from "@/lib/contact";
import { mailConfiguration, sendContactMail } from "@/lib/contact-mail";
import { requestLimit } from "@/lib/request-limit";

export const runtime = "nodejs";
const json = (value: unknown, status: number) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
export async function POST(req: NextRequest) {
  try {
    const allowed = new Set([
      req.nextUrl.origin,
      ...(process.env.BETTER_AUTH_URL
        ? [new URL(process.env.BETTER_AUTH_URL).origin]
        : []),
    ]);
    if (!allowed.has(req.headers.get("origin") || ""))
      throw new AppError(403, "Origem não permitida");
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new AppError(415, "Envie o formulário em JSON");
    const text = await req.text();
    if (Buffer.byteLength(text) > 12000)
      throw new AppError(413, "Mensagem muito longa");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new AppError(400, "Formulário inválido");
    }
    const input = contactSchema.parse(raw);
    const id = z.uuid().parse(req.headers.get("idempotency-key"));
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const existing = await db.contactRequest.findUnique({ where: { id } });
    if (existing && existing.payloadHash !== payloadHash)
      throw new AppError(409, "Os dados mudaram. Reenvie o formulário.");
    if (existing?.sentAt) return json({ id, sent: true }, 200);
    await requestLimit("contact-email", input.email, 5, 3600000);
    await requestLimit("contact-global", "all", 60, 3600000);
    const entry = await db.contactRequest.upsert({
      where: { id },
      create: { id, payloadHash, data: input, lockedUntil: new Date(0) },
      update: {},
    });
    if (entry.payloadHash !== payloadHash)
      throw new AppError(409, "Solicitação já utilizada com outros dados");
    if (entry.sentAt) return json({ id, sent: true }, 200);
    const claimed = await db.contactRequest.updateMany({
      where: { id, sentAt: null, lockedUntil: { lte: new Date() } },
      data: { lockedUntil: new Date(Date.now() + 60000) },
    });
    if (!claimed.count)
      throw new AppError(
        409,
        "Sua mensagem está sendo enviada. Aguarde um momento antes de tentar novamente.",
      );
    try {
      const remaining = CONTACT_RECIPIENTS.filter(
        (address) => !entry.acceptedRecipients.includes(address),
      );
      const accepted = remaining.length
        ? await sendContactMail(input, id, remaining)
        : [];
      const allAccepted = [
        ...new Set([...entry.acceptedRecipients, ...accepted]),
      ];
      const complete = CONTACT_RECIPIENTS.every((address) =>
        allAccepted.includes(address),
      );
      await db.contactRequest.update({
        where: { id },
        data: {
          acceptedRecipients: allAccepted,
          sentAt: complete ? new Date() : null,
          lockedUntil: new Date(0),
        },
      });
      if (!complete)
        throw new AppError(
          503,
          "O envio não foi concluído para toda a equipe. Tente novamente em instantes.",
        );
      return json({ id, sent: true }, 201);
    } catch (error) {
      await db.contactRequest.update({
        where: { id },
        data: { lockedUntil: new Date(0) },
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof AppError)
      return json({ detail: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        {
          detail:
            "Confira os campos obrigatórios, o e-mail, o WhatsApp com DDD e o consentimento.",
        },
        422,
      );
    // Do not log submitted data or SMTP credentials.
    console.error(
      "IMEIAU contact request failed",
      error instanceof Error ? error.message : String(error),
    );
    return json(
      { detail: "Não foi possível enviar. Tente novamente mais tarde." },
      500,
    );
  }
}
