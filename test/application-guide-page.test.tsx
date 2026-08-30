import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ApplicationGuidePage from "@/feature/public/application-guide/components/application-guide-page";
import { siteConfig } from "@/lib/site";

afterEach(() => {
  cleanup();
});

describe("ApplicationGuidePage", () => {
  it("says a single credit card is enough and sends other details to LINE", () => {
    render(<ApplicationGuidePage />);

    expect(
      screen.getByRole("heading", { name: "สมัคร LG Subscribe ใช้บัตรเครดิตใบเดียวก็จบ" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "มีบัตรเครดิต 1 ใบ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "รายละเอียดอื่นๆ แอด LINE ได้เลย" })).toBeInTheDocument();

    const lineLinks = screen.getAllByRole("link", { name: /LINE/ });
    expect(lineLinks.length).toBeGreaterThan(0);
    for (const link of lineLinks) {
      expect(link).toHaveAttribute("href", siteConfig.lineUrl);
    }

    expect(screen.queryByRole("heading", { name: "ไม่มีบัตรเครดิต สมัครได้ไหม?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "เช็กลิสต์ก่อนลงนาม" })).not.toBeInTheDocument();
    expect(screen.queryByText("สอบถามรายการเอกสารล่าสุด")).not.toBeInTheDocument();
  });
});
