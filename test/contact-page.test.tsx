import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ContactPage from "@/feature/public/contact/components/contact-page";

afterEach(() => {
  cleanup();
});

describe("ContactPage subscribe steps", () => {
  it("shows the subscribe steps below the contact channels", () => {
    render(<ContactPage />);

    const line = screen.getByRole("heading", { name: "LINE Official Account" });
    const email = screen.getByRole("heading", { name: "อีเมล" });
    const steps = screen.getByRole("heading", { name: "ขั้นตอนการ Subscribe สินค้า LG" });

    expect(line.compareDocumentPosition(steps)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(email.compareDocumentPosition(steps)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByRole("img", { name: /ขั้นตอนการ Subscribe/ })).not.toBeInTheDocument();
  });
});
