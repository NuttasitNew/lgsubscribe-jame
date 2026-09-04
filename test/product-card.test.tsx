import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductCard } from "@/components/product-card";
import { catalogProducts } from "@/lib/catalog-products";
import { products } from "@/lib/site";

afterEach(cleanup);

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
    expect(image.closest("[data-image-slot=image]")).toHaveClass("aspect-square", "rounded-none", "border-0");
  });

  it("shows the regular monthly price from the September price list", () => {
    const product = catalogProducts.find((item) => item.model === "WD516AN");
    expect(product?.monthlyPrice).toBe(499);

    render(<ProductCard product={product!} />);
    expect(screen.getAllByText("เริ่มต้น")[0]).toBeInTheDocument();
    expect(screen.getByText(/฿499/)).toBeInTheDocument();
    expect(screen.queryByText("สอบถามราคาล่าสุด")).not.toBeInTheDocument();
    const orderCount = screen.getByTestId("product-order-count");
    expect(orderCount).toHaveTextContent("สั่งซื้อ");
    expect(orderCount.parentElement).toHaveClass("items-end");
    expect(orderCount).toHaveClass("items-center");
    expect(screen.queryByText("ตามแพ็กเกจ")).not.toBeInTheDocument();
    expect(screen.queryByText(/สูงสุด \d+ ปี/)).not.toBeInTheDocument();
  });

  it("keeps only the model code on the image for the mobile card", () => {
    const product = catalogProducts.find((item) => item.model === "SAQ13A") ?? catalogProducts[0];
    render(<ProductCard product={product} />);
    const overlay = screen.getByTestId("product-card-mobile-meta");

    expect(overlay).toHaveTextContent(product.model);
    expect(overlay).not.toHaveTextContent(product.category);
    expect(overlay).toHaveClass("right-3", "top-3");
    expect(overlay).not.toHaveClass("left-3");
    expect(screen.getByText(product.description)).toHaveClass("line-clamp-2");

    const viewCount = screen.getByTestId("product-card-view-count");
    expect(viewCount).toHaveClass("left-3", "top-3", "z-20");
    expect(viewCount).not.toHaveClass("right-3");
    expect(screen.getByTestId("product-view-count")).toHaveTextContent("ผู้เข้าชม");
  });

  it("lets the promotion still fill the card instead of shrinking into a mobile thumbnail", () => {
    const product = catalogProducts.find((item) => item.promotionImage);
    expect(product?.promotionImage).toBeTruthy();

    const { container } = render(<ProductCard product={product!} />);
    const image = screen.getByRole("img", { name: `ภาพโปรโมชัน ${product!.name}` });

    expect(container.firstChild).not.toHaveClass("max-sm:grid");
    expect(image).toHaveClass("object-contain");
    expect(image).not.toHaveClass("p-2");
    expect(image.closest("[data-image-slot=image]")).toHaveClass("aspect-square", "rounded-none", "border-0");
  });

  it("pins the details button to the bottom of the card so a row of cards lines up", () => {
    render(<ProductCard product={products[0]} />);

    expect(screen.getByRole("link", { name: /^ดูรายละเอียด$/ }).closest("[data-slot=card-footer]")).toHaveClass(
      "mt-auto",
    );
    expect(screen.getByRole("link", { name: /^ดูรายละเอียด$/ }).closest("[data-slot=card]")).toHaveClass(
      "h-full",
      "flex",
      "flex-col",
      "isolate",
    );
  });
});
