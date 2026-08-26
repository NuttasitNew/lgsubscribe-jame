import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGallery } from "@/feature/public/products/components/product-gallery";

const images = [
  { src: "/promo.png", alt: "ภาพโปรโมชันแอร์", kind: "promotion" as const },
  { src: "/first.jpg", alt: "ภาพหน้าตรง", kind: "official" as const },
  { src: "/second.jpg", alt: "ภาพจำลองในบ้าน", kind: "generated" as const },
];

describe("ProductGallery", () => {
  it("lets customers switch images without overlay labels on the photo", () => {
    render(<ProductGallery images={images} productName="LG WashTower" />);

    expect(screen.queryByText("ภาพโปรโมชัน")).not.toBeInTheDocument();
    expect(screen.queryByText("ภาพสินค้าทางการ")).not.toBeInTheDocument();
    expect(screen.queryByText("ภาพจำลองเพื่อการนำเสนอ")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    const promoImage = screen.getByRole("img", { name: "ภาพโปรโมชันแอร์" });
    expect(promoImage).toHaveClass("object-contain");
    expect(promoImage).not.toHaveClass("p-2");
    expect(promoImage.parentElement).toHaveClass("aspect-square");

    fireEvent.click(screen.getByRole("button", { name: "ดูภาพหน้าตรง" }));
    expect(screen.getByRole("img", { name: "ภาพหน้าตรง" })).toHaveClass("object-contain");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ดูภาพจำลองในบ้าน" }));

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "ภาพจำลองในบ้าน" })).toHaveClass("object-contain");
  });
});
