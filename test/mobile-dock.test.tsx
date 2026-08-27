import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileDock } from "@/components/mobile-dock";

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

describe("MobileDock product search", () => {
  it("opens search and category from the floating dock on the products listing", async () => {
    const user = userEvent.setup();
    render(<MobileDock />);

    expect(screen.queryByRole("link", { name: "ไปยังช่องค้นหาสินค้า" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ค้นหาสินค้า LG" }));
    expect(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "กรองตามหมวดสินค้า" })).toBeVisible();

    await user.type(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" }), "AS60GHWG0");
    const results = screen.getAllByTestId("product-search-result");
    expect(results).toHaveLength(1);
    expect(within(results[0]).getByText("AS60GHWG0")).toBeVisible();
    expect(results[0]).toHaveAttribute("href", "/products/lg-as60ghwg0");
  });

  it("lets a product detail page search the catalog from the same dock", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/products/lg-saq13a/";
    render(<MobileDock />);

    expect(screen.queryByRole("button", { name: "เปิดหมวดสินค้าแบบด่วน" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ค้นหาสินค้า LG" }));
    await user.type(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" }), "SAQ13A");

    expect(screen.getAllByTestId("product-search-result")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "ดูบนหน้าสินค้า" })).toHaveAttribute(
      "href",
      "/products?q=SAQ13A",
    );
  });

  it("keeps the category picker on non-product pages", () => {
    navigation.pathname = "/contact/";
    render(<MobileDock />);

    expect(screen.getByRole("button", { name: "เปิดหมวดสินค้าแบบด่วน" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ค้นหาสินค้า LG" })).not.toBeInTheDocument();
  });
});
