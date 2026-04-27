// dist/ をストア提出用 zip に固める。
//   node scripts/pack.mjs
// 出力: release/sidememo-<version>.zip
import { createWriteStream, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");
const releaseDir = resolve(root, "release");

if (!existsSync(distDir)) {
  console.error('[pack] "dist/" が存在しません。先に `npm run build` を実行してください。');
  process.exit(1);
}

const manifestPath = resolve(distDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error("[pack] dist/manifest.json が見つかりません。ビルドが正常に終了していません。");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const version = manifest.version ?? "0.0.0";
const name = (manifest.name ?? "sidememo").toLowerCase().replace(/\s+/g, "-");

mkdirSync(releaseDir, { recursive: true });
const outFile = resolve(releaseDir, `${name}-${version}.zip`);
const out = createWriteStream(outFile);

const archive = archiver("zip", { zlib: { level: 9 } });
archive.on("warning", (err) => {
  if (err.code === "ENOENT") {
    console.warn("[pack] warning:", err.message);
  } else {
    throw err;
  }
});
archive.on("error", (err) => {
  throw err;
});

out.on("close", () => {
  const sizeKb = (archive.pointer() / 1024).toFixed(1);
  console.log(`[pack] ${outFile} (${sizeKb} KB)`);
});

archive.pipe(out);
// dist/ の中身をルート直下に格納する (Chrome ウェブストアの想定形式)
archive.directory(distDir, false);
archive.finalize();
