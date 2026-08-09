import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGallery } from "@/feature/public/products/components/product-gallery";

const images = [
  { src: "/first.jpg", alt: "ภาพหน้าตรง", kind: "official" as const },
  { src: "/second.jpg", alt: "ภาพจำลองในบ้าน", kind: "generated" as const },
];

describe("ProductGallery", () => {
  it("lets customers switch images and distinguishes generated artwork", () => {
    render(<ProductGallery images={images} productName="LG WashTower" />);

    expect(screen.getByText("ภาพสินค้าทางการ")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ดูภาพจำลองในบ้าน" }));

    expect(screen.getByText("ภาพจำลองเพื่อการนำเสนอ")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "ภาพจำลองในบ้าน" })).toHaveClass("object-contain");
  });
});
