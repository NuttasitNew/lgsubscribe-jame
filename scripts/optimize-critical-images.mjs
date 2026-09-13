import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

await import("./optimize-campaign-image.mjs");
const source = "/images/hero/lg-subscribe-official-products-composite-v2.png";
const input = await readFile(`public${source}`);
const mobile = await sharp(input).resize({ width: 750 }).avif({ quality: 45, effort: 7 }).toBuffer();
const desktop = await sharp(input).avif({ quality: 55, effort: 7 }).toBuffer();
const hash = createHash("sha256").update(desktop).digest("hex").slice(0, 10);
const desktopSrc = `/images/optimized/home-hero-${hash}-1604.avif`;
await writeFile(`public${desktopSrc}`, desktop);
await writeFile(
  "lib/home-hero-image.json",
  JSON.stringify({ source, mobileSrc: `data:image/avif;base64,${mobile.toString("base64")}`, desktopSrc }) +
    "\n",
);
console.log("Generated responsive hero", { mobileBytes: mobile.length, desktopBytes: desktop.length });
