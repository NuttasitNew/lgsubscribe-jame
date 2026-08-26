import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";

const navigation = vi.hoisted(() => ({
  pathname: "/products/",
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  navigation.pathname = "/products/";
  navigation.replace.mockReset();
  navigation.push.mockReset();
});

describe("SiteHeader", () => {
  it("turns the top-right สินค้า control into search on the products page", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    expect(screen.getByRole("button", { name: "ค้นหาสินค้า" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ค้นหาสินค้า" }));
    expect(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" })).toBeVisible();
  });

  it("keeps the สินค้า shortcut on other pages", () => {
    navigation.pathname = "/contact/";
    render(<SiteHeader />);

    expect(screen.getAllByRole("link", { name: "สินค้า" })[0]).toHaveAttribute("href", "/products");
    expect(screen.queryByRole("button", { name: "ค้นหาสินค้า" })).not.toBeInTheDocument();
  });

  it("does not show a โปรโมชัน item that would send people to /price/", () => {
    render(<SiteHeader />);

    expect(screen.queryByRole("link", { name: "โปรโมชัน" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "สินค้า" })[0]).toHaveAttribute("href", "/products");
  });
});
