import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FaqPage from "@/feature/public/faq/components/faq-page";
import { faqs } from "@/lib/site";

afterEach(() => {
  cleanup();
});

describe("FaqPage", () => {
  it("shows the LG Subscribe FAQ heading and every shared question", () => {
    render(<FaqPage />);

    expect(screen.getByText("FAQ LG Subscribe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "คำถามที่พบบ่อย" })).toBeInTheDocument();

    for (const faq of faqs) {
      expect(screen.getByRole("button", { name: faq.question })).toBeInTheDocument();
    }
  });
});
