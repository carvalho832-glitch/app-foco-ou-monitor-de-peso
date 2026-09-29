import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.join(
  process.cwd(),
  "node_modules",
  "@capgo",
  "capacitor-health",
  "android",
  "src",
  "main",
  "AndroidManifest.xml"
);

const allowed = new Set([
  "android.permission.health.READ_STEPS",
  "android.permission.health.READ_DISTANCE",
  "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
  "android.permission.health.READ_HEART_RATE",
  "android.permission.health.READ_WEIGHT",
  "android.permission.health.READ_SLEEP",
  "android.permission.health.READ_OXYGEN_SATURATION",
  "android.permission.health.READ_RESTING_HEART_RATE",
  "android.permission.health.READ_EXERCISE"
]);

let xml = await readFile(manifestPath, "utf8");
const before = xml;

xml = xml.replace(
  /\s*<uses-permission\s+android:name="(android\.permission\.health\.(?:READ|WRITE)_[A-Z0-9_]+)"\s*\/>/g,
  (full, permission) => allowed.has(permission) ? full : ""
);

await writeFile(manifestPath, xml, "utf8");

const kept = [...xml.matchAll(/android:name="(android\.permission\.health\.(?:READ|WRITE)_[A-Z0-9_]+)"/g)]
  .map(match => match[1]);

console.log("Permissões Health Connect mantidas:", kept.join(", "));
if (before === xml) {
  console.warn("Aviso: nenhuma permissão foi removida do manifesto do plugin.");
}
