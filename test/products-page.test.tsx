import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ProductsPage from "@/feature/public/products/components/products-page";
import { allProducts, catalogProducts } from "@/lib/catalog-products";
import { knowledgeInventory, productKnowledgeGuides } from "@/lib/product-knowledge";

afterEach(cleanup);

describe("ProductsPage knowledge visibility", () => {
  it("renders every extracted model as a visible catalog card", () => {
    render(<ProductsPage />);

    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(knowledgeInventory.modelCount);
    expect(screen.getAllByText("AS10GDBY0")[0]).toBeVisible();
    expect(screen.getAllByText("32GS95UV-B")[0]).toBeVisible();

    const itemListJson = document.querySelector('script[type="application/ld+json"]')?.textContent;
    expect(itemListJson).toBeTruthy();
    expect(JSON.parse(itemListJson ?? "{}").itemListElement).toHaveLength(knowledgeInventory.modelCount);
  });

  it("renders the 47 models as real product cards with local artwork and detail links", () => {
    render(<ProductsPage />);

    expect(catalogProducts).toHaveLength(knowledgeInventory.modelCount);
    expect(
      screen.queryByRole("heading", { name: `สินค้า LG ทั้ง ${knowledgeInventory.modelCount} รุ่น` }),
    ).not.toBeInTheDocument();

    const cards = screen.getAllByTestId("catalog-model-card");
    for (const [index, card] of cards.entries()) {
      const product = catalogProducts[index];
      expect(decodeURIComponent(within(card).getByRole("img").getAttribute("src") ?? "")).toContain(
        product.image,
      );
      expect(product.image).toMatch(/^\/images\/products\/lg-catalog\//);
      expect(within(card).getByRole("link", { name: "ดูรายละเอียด" })).toHaveAttribute(
        "href",
        `/products/${product.slug}`,
      );
    }
  });

  it("keeps every official product image inside the project", () => {
    for (const product of catalogProducts) {
      expect(product.imageSource).toMatch(/^https:\/\/www\.lg\.com\//);
      expect(existsSync(join(process.cwd(), "public", product.image))).toBe(true);
    }
  });

  it("publishes only one detail route for each model code", () => {
    expect(new Set(allProducts.map((product) => product.model)).size).toBe(allProducts.length);
  });

  it("starts with a sticky finder while keeping a semantic page heading", () => {
    render(<ProductsPage />);

    expect(
      screen.getByRole("heading", { name: "สินค้าเครื่องใช้ไฟฟ้า LG แบบรายเดือน", level: 1 }),
    ).toHaveClass("sr-only");
    expect(screen.queryByRole("link", { name: /ดูสินค้าทั้ง 47 รุ่น/ })).not.toBeInTheDocument();
    expect(screen.queryByText("พบ 47 รุ่น")).not.toBeInTheDocument();

    const catalogRegion = screen.getByRole("region", { name: "รายการสินค้าจากเอกสาร" });
    expect(catalogRegion).toHaveAttribute("id", "product-knowledge");
    expect(document.querySelector("#catalog-search")).toHaveClass("sticky", "top-[76px]");
    expect(within(catalogRegion).getAllByTestId("catalog-model-card")).toHaveLength(
      knowledgeInventory.modelCount,
    );
    expect(screen.queryByText("Product knowledge library")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ดูเพิ่มอีก/ })).not.toBeInTheDocument();
  });

  it("filters the catalog by category and model code", () => {
    render(<ProductsPage />);

    const categoryNavigation = screen.getByRole("navigation", { name: "กรองตามหมวดสินค้า" });
    const categoryButtons = within(categoryNavigation).getAllByRole("button");
    expect(categoryButtons).toHaveLength(productKnowledgeGuides.length + 1);

    fireEvent.click(within(categoryNavigation).getByRole("button", { name: "เครื่องฟอกอากาศ 6 รุ่น" }));
    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(6);
    expect(screen.getByRole("heading", { name: "เครื่องฟอกอากาศ", level: 2 })).toBeInTheDocument();
    expect(screen.queryByText("SEQ13A")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" }), {
      target: { value: "AS35GGW10" },
    });
    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(1);
    expect(screen.getByText("AS35GGW10")).toBeVisible();
  });
});
import { existsSync } from "node:fs";
import { join } from "node:path";
