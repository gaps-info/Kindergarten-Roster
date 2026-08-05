import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceClient = resolve(root, "dist/client");
const sourceServer = resolve(root, "dist/server");
const output = resolve(root, "pages-dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(sourceClient, output, { recursive: true, force: true });
await cp(sourceServer, output, { recursive: true, force: true });
await writeFile(resolve(output, "_worker.js"), 'export { default } from "./index.js";\n', "utf8");
await rm(resolve(root, ".wrangler/deploy/config.json"), { force: true });

console.log(`Cloudflare Pages output prepared at ${output}`);
