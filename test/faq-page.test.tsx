import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FaqPage from "@/feature/public/faq/components/faq-page";
import { faqs } from "@/lib/site";

vi.mock("@/feature/public/faq/lib/published-faqs", () => ({ listPublishedFaqs: async () => [] }));

afterEach(() => {
  cleanup();
});

describe("FaqPage", () => {
  it("shows the LG Subscribe FAQ heading and every shared question", async () => {
    render(await FaqPage());

    expect(screen.getByText("FAQ LG Subscribe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "คำถามที่พบบ่อย" })).toBeInTheDocument();

    for (const faq of faqs) {
      expect(screen.getByRole("button", { name: faq.question })).toBeInTheDocument();
    }

    expect(screen.queryByRole("link", { name: "อ่านฉบับสรุป" })).not.toBeInTheDocument();
  });
});
