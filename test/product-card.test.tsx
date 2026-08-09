import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/site";

describe("ProductCard", () => {
  it("shows the verified official product packshot with accessible product content", () => {
    render(<ProductCard product={products[0]} />);

    expect(screen.getByRole("heading", { name: products[0].name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^ดูรายละเอียด$/ })).toHaveAttribute(
      "href",
      `/products/${products[0].slug}`,
    );
    const image = screen.getByRole("img", { name: `ภาพสินค้า ${products[0].name}` });
    expect(decodeURIComponent(image.getAttribute("src") ?? "")).toContain(
      "/images/products/official/puricare-wd516an-aslplmt.jpg",
    );
  });
});
