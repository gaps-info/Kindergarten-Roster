import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceClient = resolve(root, "dist/client");
const sourceServer = resolve(root, "dist/server");
const output = resolve(root, "pages-dist");
const workerOutput = resolve(output, "_worker.js");
const publicAssetPrefix = "static-v2-";

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(sourceClient, output, { recursive: true, force: true });
await mkdir(workerOutput, { recursive: true });
await cp(sourceServer, workerOutput, { recursive: true, force: true });
await rename(resolve(workerOutput, "index.js"), resolve(workerOutput, "app.js"));
await writeFile(
  resolve(workerOutput, "index.js"),
  `import app from "./app.js";\nexport default {\n  fetch(request, env, context) {\n    const url = new URL(request.url);\n    const pathname = url.pathname;\n    if (pathname.startsWith("/static-v2-")) return env.ASSETS.fetch(request);\n    if (/^\\/[^/]+\\.(?:js|css)$/.test(pathname)) {\n      url.pathname = \`/static-v2-\${pathname.slice(1)}\`;\n      return env.ASSETS.fetch(new Request(url, request));\n    }\n    return app.fetch(request, env, context);\n  },\n};\n`,
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
    let updated = original
      .replaceAll('\"/assets/', `\"/${publicAssetPrefix}`)
      .replaceAll("'/assets/", `'/${publicAssetPrefix}`);
    if (entry.name.startsWith(publicAssetPrefix) && entry.name.endsWith(".js")) {
      updated = updated.replace(/(["'])\.\/([^"']+\.(?:js|css))\1/g, `$1/${publicAssetPrefix}$2$1`);
    }
    if (updated !== original) await writeFile(path, updated, "utf8");
  }
}

async function flattenPublicAssets(assetDirectory, destination) {
  for (const entry of await readdir(assetDirectory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    await rename(resolve(assetDirectory, entry.name), resolve(destination, `${publicAssetPrefix}${entry.name}`));
  }
  await rm(assetDirectory, { recursive: true, force: true });
}
