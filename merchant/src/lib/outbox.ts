import { createHmac } from "node:crypto";
import { db } from "./db";
// Delivery is at least once. The receiving gateway must deduplicate by event.id.
export async function dispatchEvents(storeId?: string) {
  const events = await db.outboxEvent.findMany({
    where: {
      ...(storeId ? { storeId } : {}),
      status: { in: ["pending", "failed", "processing"] },
      availableAt: { lte: new Date() },
    },
    take: 30,
    orderBy: { createdAt: "asc" },
  });
  for (const event of events) {
    const claim = await db.outboxEvent.updateMany({
      where: {
        id: event.id,
        status: event.status,
        availableAt: { lte: new Date() },
      },
      data: {
        status: "processing",
        availableAt: new Date(Date.now() + 60000),
        attempts: { increment: 1 },
      },
    });
    if (!claim.count) continue;
    try {
      if (process.env.INTEGRATION_MODE === "webhook") {
        const url = process.env.INTEGRATION_WEBHOOK_URL,
          secret = process.env.INTEGRATION_WEBHOOK_SECRET;
        if (!url || !secret || !url.startsWith("https://"))
          throw new Error("Gateway HTTPS e segredo não configurados");
        const body = JSON.stringify({
          id: event.id,
          type: event.type,
          storeId: event.storeId,
          tradeInId: event.tradeInId,
          payload: event.payload,
        });
        const timestamp = Date.now().toString();
        const signature = createHmac("sha256", secret)
          .update(`${timestamp}.${body}`)
          .digest("hex");
        const response = await fetch(url, {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": event.id,
            "X-Volta-Timestamp": timestamp,
            "X-Volta-Signature": signature,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok)
          throw new Error(`Gateway respondeu HTTP ${response.status}`);
      }
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { status: "delivered", deliveredAt: new Date(), lastError: null },
      });
    } catch (error) {
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          lastError:
            error instanceof Error ? error.message : "Falha de integração",
          availableAt: new Date(
            Date.now() +
              Math.min(3600000, 1000 * 2 ** Math.min(event.attempts + 1, 12)),
          ),
        },
      });
    }
  }
  return events.length;
}
