import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Run against `next start` or a deployment, never the development server.
const args = process.argv.slice(2);
const option = (name, fallback) =>
  args
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") ?? fallback;
const base = new URL(args.find((arg) => !arg.startsWith("--")) ?? "http://localhost:3100");
const device = args.includes("--desktop") ? "desktop" : "mobile";
const runs = Number(option("runs", "1"));
const minimum = Number(option("min-score", "99"));
if (
  !Number.isInteger(runs) ||
  runs < 1 ||
  runs > 10 ||
  !Number.isFinite(minimum) ||
  minimum < 0 ||
  minimum > 100
) {
  throw new Error("Use --runs=1..10 and --min-score=0..100");
}
const routes = option("routes", "/,/products/,/products/lg-washtower-wt1410nheg/,/contact/").split(",");
const directory = `.reports/lighthouse/${new Date().toISOString().replaceAll(":", "-")}-${device}`;
await mkdir(directory, { recursive: true });
const results = [];
for (const route of routes) {
  for (let run = 1; run <= runs; run++) {
    const url = new URL(route, base).href;
    const output = `${directory}/${route.replace(/[^a-z0-9]+/gi, "-") || "home"}-${run}`;
    const child = spawnSync(
      process.execPath,
      [
        fileURLToPath(import.meta.resolve("lighthouse/cli/index.js")),
        url,
        "--chrome-flags=--headless --no-sandbox",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=json",
        "--output=html",
        `--output-path=${output}`,
        "--quiet",
        ...(device === "desktop" ? ["--preset=desktop"] : []),
      ],
      { stdio: "inherit" },
    );
    if (child.status !== 0) process.exit(child.status ?? 1);
    const report = JSON.parse(await readFile(`${output}.report.json`, "utf8"));
    if (report.runtimeError) throw new Error(JSON.stringify(report.runtimeError));
    const scores = Object.fromEntries(
      Object.entries(report.categories).map(([name, category]) => [name, Math.round(category.score * 100)]),
    );
    const result = {
      url,
      device,
      run,
      scores,
      lcpMs: report.audits["largest-contentful-paint"].numericValue,
      cls: report.audits["cumulative-layout-shift"].numericValue,
      report: `${output}.report.html`,
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
await writeFile(`${directory}/summary.json`, JSON.stringify(results, null, 2));
console.log(`Reports: ${directory}`);
if (
  args.includes("--check") &&
  results.some(({ scores }) => Object.values(scores).some((score) => score < minimum))
)
  process.exitCode = 1;
