import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AuthorizedPage from "@/feature/public/authorized/components/authorized-page";
import { authorizedAgent, siteConfig, siteOperatorDisclosure } from "@/lib/site";

afterEach(() => {
  cleanup();
});

describe("AuthorizedPage", () => {
  it("shows how to verify the sales manager agent code with LG Call Center", () => {
    render(<AuthorizedPage />);

    expect(screen.getByRole("heading", { name: "ความน่าเชื่อถือ", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ภาพรับรางวัล" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: `คุณ${authorizedAgent.nameTh}` })).toBeInTheDocument();
    expect(screen.getByText(authorizedAgent.roleTh)).toBeInTheDocument();
    const awardPhoto = screen.getByRole("img", { name: authorizedAgent.photoAlt });
    expect(decodeURIComponent(awardPhoto.getAttribute("src") ?? "")).toContain(authorizedAgent.photo);
    expect(awardPhoto).toHaveClass("object-contain", "h-auto", "w-full");
    expect(awardPhoto).not.toHaveClass("object-cover");
    expect(awardPhoto.closest("figure")).toHaveClass("max-w-sm");
    expect(screen.queryByText(/ภาพเต็มจากพิธีมอบรางวัล/)).not.toBeInTheDocument();
    expect(screen.getByText(authorizedAgent.nameEn)).toBeInTheDocument();
    expect(screen.getByText(authorizedAgent.code)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `โทร ${authorizedAgent.verificationPhone.label}` })).toHaveAttribute(
      "href",
      authorizedAgent.verificationPhone.href,
    );
    expect(screen.getByText(siteOperatorDisclosure.en.credentials)).toBeInTheDocument();
    expect(screen.getAllByText(/ไม่ใช่เว็บไซต์ทางการของ LG Electronics/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: `LINE Official Account ${siteConfig.lineId}` })).toHaveAttribute(
      "href",
      siteConfig.lineUrl,
    );
    expect(screen.getByText(`โทร ${authorizedAgent.verificationPhone.name}`)).toBeInTheDocument();
    expect(screen.getByText("แจ้งรหัสตัวแทน")).toBeInTheDocument();
    expect(screen.queryByText("รอการยืนยัน")).not.toBeInTheDocument();
    expect(
      screen.queryByText("เจ้าหน้าที่จะยืนยันได้ว่าเป็นตัวแทนการขายที่ได้รับอนุญาต ไม่ใช่บริษัท LG เอง"),
    ).not.toBeInTheDocument();
  });
});
