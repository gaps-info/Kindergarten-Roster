import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceClient = resolve(root, "dist/client");
const sourceServer = resolve(root, "dist/server");
const output = resolve(root, "pages-dist");
const workerOutput = resolve(output, "_worker.js");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(sourceClient, output, { recursive: true, force: true });
await mkdir(workerOutput, { recursive: true });
await cp(sourceServer, workerOutput, { recursive: true, force: true });
await rename(resolve(workerOutput, "index.js"), resolve(workerOutput, "app.js"));
await writeFile(
  resolve(workerOutput, "index.js"),
  `import app from "./app.js";\nexport default {\n  fetch(request, env, context) {\n    const pathname = new URL(request.url).pathname;\n    if (pathname.startsWith("/static-")) return env.ASSETS.fetch(request);\n    return app.fetch(request, env, context);\n  },\n};\n`,
  "utf8",
);
await flattenPublicAssets(resolve(output, "assets"), output);
await rewritePublicAssetPaths(output);
await rm(resolve(root, ".wrangler/deploy/config.json"), { force: true });

console.log(`Cloudflare Pages output prepared at ${output}`);

async function rewritePublicAssetPaths(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await rewritePublicAssetPaths(path);
      continue;
    }
    if (entry.name !== "_headers" && !/\.(?:js|json|html|css)$/.test(entry.name)) continue;
    const original = await readFile(path, "utf8");
    const updated = original.replaceAll('\"/assets/', '\"/static-').replaceAll("'/assets/", "'/static-");
    if (updated !== original) await writeFile(path, updated, "utf8");
  }
}

async function flattenPublicAssets(assetDirectory, destination) {
  for (const entry of await readdir(assetDirectory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    await rename(resolve(assetDirectory, entry.name), resolve(destination, `static-${entry.name}`));
  }
  await rm(assetDirectory, { recursive: true, force: true });
}
