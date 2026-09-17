import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const raiz = process.cwd();
const destino = resolve(raiz, "www");

const arquivos = [
  "index.html",
  "style.css",
  "menu-animated.css",
  "script.js",
  "cloud-loader.js",
  "dashboard-v2.js",
  "firebase-config.js",
  "firebase-cloud.js",
  "native-backup.js",
  "cloud-sync.js",
  "food-photo.js",
  "manifest.json",
  "sw.js",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "diagnostico-dados.html"
];

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });

for (const arquivo of arquivos) {
  await copyFile(resolve(raiz, arquivo), resolve(destino, arquivo));
}

console.log(`Arquivos web preparados em ${destino}`);
