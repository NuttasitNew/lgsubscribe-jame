import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductGallery } from "@/feature/public/products/components/product-gallery";

const images = [
  { src: "/promo.png", alt: "ภาพโปรโมชันแอร์", kind: "promotion" as const },
  { src: "/first.jpg", alt: "ภาพหน้าตรง", kind: "official" as const },
  { src: "/second.jpg", alt: "ภาพจำลองในบ้าน", kind: "generated" as const },
];

const manyImages = Array.from({ length: 8 }, (_, index) => ({
  src: `/gallery-${index + 1}.jpg`,
  alt: `ภาพสินค้า ${index + 1}`,
  kind: "official" as const,
}));

afterEach(cleanup);

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
    expect(promoImage.closest("[data-gallery-stage]")).toHaveClass("aspect-square");

    fireEvent.click(screen.getByRole("button", { name: "ดูภาพหน้าตรง" }));
    expect(screen.getByRole("img", { name: "ภาพหน้าตรง" })).toHaveClass("object-contain");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ดูภาพจำลองในบ้าน" }));

    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "ภาพจำลองในบ้าน" })).toHaveClass("object-contain");
  });

  it("lets customers swipe through product photos in a carousel", () => {
    render(<ProductGallery images={images} productName="LG WashTower" />);

    const photoCarousel = screen.getByRole("region", { name: "ภาพสินค้า LG WashTower" });
    expect(photoCarousel).toHaveAttribute("aria-roledescription", "carousel");
    expect(photoCarousel).toHaveClass("overflow-x-auto", "snap-x");
    expect(screen.getByRole("button", { name: "ภาพก่อนหน้า" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "ภาพถัดไป" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ภาพก่อนหน้า" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "ภาพถัดไป" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ภาพถัดไป" })).toBeDisabled();
  });

  it("keeps the preview thumbnails in a single scrollable row when there are many photos", () => {
    render(<ProductGallery images={manyImages} productName="LG WashTower" />);

    const previewCarousel = screen.getByRole("region", { name: "เลือกภาพสินค้า" });
    expect(previewCarousel).toHaveAttribute("aria-roledescription", "carousel");
    expect(previewCarousel).toHaveClass("overflow-x-auto", "snap-x", "min-w-0");
    expect(previewCarousel).not.toHaveClass("flex-wrap");
    expect(previewCarousel.querySelectorAll("button")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "เลื่อนดูภาพตัวอย่างก่อนหน้า" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เลื่อนดูภาพตัวอย่างถัดไป" })).toBeInTheDocument();
  });
});
