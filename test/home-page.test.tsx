import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomePage } from "@/feature/public/home/components/home-page";
import { buildProductsSearchHref } from "@/lib/catalog-search";

afterEach(() => {
  cleanup();
});

function catalogHref(category: string) {
  return buildProductsSearchHref("", category).replace("/products/", "/products");
}

describe("HomePage popular categories", () => {
  it("opens the catalog filtered to the selected category", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /ตู้เย็น LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("ตู้เย็น"),
    );
    expect(screen.getByRole("link", { name: /เครื่องซักผ้า LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("เครื่องซักผ้าและอบผ้า"),
    );
    expect(screen.getByRole("link", { name: /เครื่องปรับอากาศ LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("เครื่องปรับอากาศ"),
    );
    expect(screen.getByRole("link", { name: /เครื่องกรองน้ำ LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("เครื่องกรองน้ำ"),
    );
    expect(screen.getByRole("link", { name: /เครื่องดูดฝุ่น LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("เครื่องดูดฝุ่น"),
    );
    expect(screen.getByRole("link", { name: /ทีวีและความบันเทิง LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("ทีวีและเครื่องเสียง"),
    );
    expect(screen.getByRole("link", { name: /เครื่องฟอกอากาศ LG รุ่น/ })).toHaveAttribute(
      "href",
      catalogHref("เครื่องฟอกอากาศ"),
    );
    expect(screen.getByRole("link", { name: "ดูสินค้าทั้งหมด →" })).toHaveAttribute("href", "/products");
  });
});
