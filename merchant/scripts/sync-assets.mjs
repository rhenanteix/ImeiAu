import { copyFile, mkdir } from "node:fs/promises";
const target = new URL("../public/", import.meta.url),
  source = new URL("../../static/", import.meta.url);
await mkdir(target, { recursive: true });
for (const file of ["widget.js", "styles.css", "landing.js"])
  await copyFile(new URL(file, source), new URL(file, target));
await copyFile(new URL("index.html", source), new URL("demo.html", target));
