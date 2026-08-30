import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomePage } from "@/feature/public/home/components/home-page";
import { bestSellerProducts } from "@/lib/catalog-products";
import { buildProductsSearchHref } from "@/lib/catalog-search";
import { faqs } from "@/lib/site";

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
    expect(screen.getAllByRole("link", { name: "ดูสินค้าทั้งหมด →" })[0]).toHaveAttribute(
      "href",
      "/products",
    );
  });
});

describe("HomePage best sellers", () => {
  it("shows the three featured subscription models with product detail links", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "สินค้าขายดี" })).toBeInTheDocument();
    expect(bestSellerProducts.map((product) => product.slug)).toEqual([
      "lg-washtower-wt1410nheg",
      "lg-x257cmew",
      "lg-saq11a",
    ]);

    for (const product of bestSellerProducts) {
      expect(screen.getByRole("heading", { name: product.name })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: `ดูรายละเอียด ${product.name}` })).toHaveAttribute(
        "href",
        `/products/${product.slug}`,
      );
    }
  });
});

describe("HomePage FAQ", () => {
  it("shows the shared FAQ questions and links to the FAQ page", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "คำถามที่พบบ่อย" })).toBeInTheDocument();
    expect(screen.getByText("FAQ LG Subscribe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ดูทั้งหมด →" })).toHaveAttribute("href", "/faq");

    for (const faq of faqs) {
      expect(screen.getByRole("button", { name: faq.question })).toBeInTheDocument();
    }
  });

  it("uses the same page width as the reviews section", () => {
    const { container } = render(<HomePage />);
    const faqContainer = container.querySelector("#faq > div");
    const reviewsContainer = container.querySelector("#reviews > div");

    expect(faqContainer).toHaveClass("container-page");
    expect(faqContainer).not.toHaveClass("max-w-4xl");
    expect(reviewsContainer).toHaveClass("container-page");
  });
});
