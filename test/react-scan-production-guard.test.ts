import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("react-scan stays off in production", () => {
  it("does not ship client instrumentation that always loads react-scan", () => {
    if (!existsSync("instrumentation-client.ts") && !existsSync("instrumentation-client.js")) {
      return;
    }

    const source = existsSync("instrumentation-client.ts")
      ? readFileSync("instrumentation-client.ts", "utf8")
      : readFileSync("instrumentation-client.js", "utf8");

    expect(source).not.toMatch(/from ["']react-scan["']/);
    expect(source).not.toMatch(/require\(["']react-scan["']\)/);
  });

  it("does not mount react-scan from the root layout", () => {
    const source = readFileSync("app/layout.tsx", "utf8");

    expect(source).not.toMatch(/ReactScan/);
    expect(source).not.toMatch(/from ["']react-scan["']/);
    expect(source).not.toMatch(/from ["']@\/components\/dev\/react-scan["']/);
  });
});
