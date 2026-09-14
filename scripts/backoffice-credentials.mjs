import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Generate, never print, secrets. Copy the env values to the deployment's secret
// manager and deliver the generated password to the operator outside Git.
const environment = process.argv[2];
if (!["development", "production"].includes(environment))
  throw new Error("Usage: npm run backoffice:credentials -- development|production");
const password = randomBytes(24).toString("base64url"),
  salt = randomBytes(16).toString("hex");
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const id = new Date().toISOString().replace(/[:.]/g, "-");
const folder = resolve("tmp/seo-setup");
mkdirSync(folder, { recursive: true, mode: 0o700 });
const envPath = resolve(folder, `${environment}-credentials-${id}.env`);
const passwordPath = resolve(folder, `${environment}-password-${id}.txt`);
writeFileSync(
  envPath,
  `BACKOFFICE_PASSWORD_HASH=${hash}\nBACKOFFICE_SESSION_SECRET=${randomBytes(32).toString("hex")}\nCRON_SECRET=${randomBytes(32).toString("hex")}\n`,
  { mode: 0o600, flag: "wx" },
);
writeFileSync(passwordPath, password + "\n", { mode: 0o600, flag: "wx" });
console.log(
  `Credentials saved to ${envPath}\nPassword saved to ${passwordPath}\nNo secrets were printed or applied to a running environment.`,
);
