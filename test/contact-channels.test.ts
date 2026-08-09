import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site";

describe("sales contact channels", () => {
  it("keeps the official LINE account, email, and both sales phone numbers", () => {
    expect(siteConfig.lineId).toBe("@lgsubscribe");
    expect(siteConfig.lineUrl).toBe("https://line.me/R/ti/p/%40lgsubscribe");
    expect(siteConfig.email).toBe("lgsubscribe.th@gmail.com");
    expect(siteConfig.phoneNumbers).toEqual([
      { label: "084-974-8429", href: "tel:+66849748429" },
      { label: "086-551-5949", href: "tel:+66865515949" },
    ]);
  });

  it("uses the shared sales contact details on the main contact surfaces", () => {
    const contactSurfaces = [
      "app/layout.tsx",
      "components/mobile-dock.tsx",
      "components/site-footer.tsx",
      "feature/public/contact/components/contact-page.tsx",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(contactSurfaces).toContain("siteConfig.phoneNumbers");
    expect(contactSurfaces).toContain("siteConfig.email");
    expect(contactSurfaces).toContain("siteConfig.lineUrl");
  });
});
