import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const db = await PGlite.create(
  process.env.TEST_DB_DIR || "/private/tmp/volta-merchant-pglite",
);
const server = new PGLiteSocketServer({
  db,
  host: "127.0.0.1",
  port: 55432,
  maxConnections: 20,
});
await server.start();
console.log("Test PostgreSQL ready at 127.0.0.1:55432");
const close = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
