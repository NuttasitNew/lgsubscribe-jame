import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createPageMetadata } from "@/lib/site";

describe("LG brand assets", () => {
  it("uses the official path-based logo instead of rendered LG text", () => {
    const logo = readFileSync("public/brand/lg-logo.svg", "utf8");
    const icon = readFileSync("app/icon.svg", "utf8");

    expect(logo).toContain("#A50034");
    expect(icon).toContain("#A50034");
    expect(logo).not.toContain("<text");
    expect(icon).not.toContain("<text");
  });

  it("uses the official LG social image for default page metadata", () => {
    const metadata = createPageMetadata({
      title: "ตัวอย่างหน้า",
      description: "คำอธิบายตัวอย่าง",
      path: "/example/",
    });

    expect(JSON.stringify(metadata.openGraph)).toContain("/brand/lg-logo-social.png");
    expect(JSON.stringify(metadata.twitter)).toContain("/brand/lg-logo-social.png");
  });
});
