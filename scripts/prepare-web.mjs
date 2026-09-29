import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "www");
const files = [
  "index.html",
  "style.css",
  "menu-animated.css",
  "script.js",
  "cloud-loader.js",
  "cloud-sync.js",
  "food-photo.js",
  "health-connect.js",
  "privacy-policy.html",
  "manifest.json",
  "sw.js",
  "icon.svg",
  "icon-192.png",
  "icon-512.png"
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const name of files) {
  const src = path.join(root, name);
  if (existsSync(src)) {
    await cp(src, path.join(out, name), { recursive: true });
  }
}

console.log("Web assets preparados:", (await readdir(out)).join(", "));
