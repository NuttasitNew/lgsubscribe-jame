import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = process.argv[2] ?? "/images/campaigns/lg-subscribe-day-popup.jpg";
if (!source.startsWith("/images/") || source.includes("..")) throw new Error("Use a path under /images/");
const input = await readFile(`public${source}`);
const settings = { widths: [384, 750, 1024], quality: 35, effort: 7 };
const hash = createHash("sha256")
  .update(input)
  .update(JSON.stringify(settings))
  .update(JSON.stringify(sharp.versions))
  .digest("hex")
  .slice(0, 10);
await mkdir("public/images/optimized", { recursive: true });
const images = [];
for (const width of settings.widths) {
  const src = `/images/optimized/subscribe-day-${hash}-${width}.avif`;
  await sharp(input)
    .resize({ width })
    .avif({ quality: settings.quality, effort: settings.effort })
    .toFile(`public${src}`);
  images.push({ width, src });
}
await writeFile("lib/subscribe-day-image.json", JSON.stringify({ source, images }, null, 2) + "\n");
console.log("Generated", images.map(({ src }) => src).join("\n"));

await writeFile(
  "lib/subscribe-day-image-inline.json",
  JSON.stringify({
    src: `data:image/avif;base64,${(await readFile(`public${images[1].src}`)).toString("base64")}`,
  }) + "\n",
);
