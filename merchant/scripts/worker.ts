import "dotenv/config";
import { dispatchEvents } from "../src/lib/outbox";
import { db } from "../src/lib/db";
try {
  console.log(`Eventos processados: ${await dispatchEvents()}`);
} finally {
  await db.$disconnect();
}
