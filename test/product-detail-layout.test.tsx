import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "@/app/(public)/layout";
import ProductDetailPage from "@/feature/public/products/components/product-detail-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/products/lg-24u421a-b/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

describe("product detail spacing", () => {
  it("shows the promotion still first in the gallery when this model has one", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-saq13a" }),
      }),
    );

    expect(screen.queryByText("ภาพโปรโมชัน")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ภาพโปรโมชัน/ })).toHaveClass("object-contain");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ดูภาพสินค้า/ }));
    expect(screen.queryByText("ภาพสินค้าทางการ")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ภาพสินค้า/ })).toHaveClass("object-contain");
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("keeps the official packshot only when the model has no promotion still", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-24u421a-b" }),
      }),
    );

    expect(screen.queryByText("ภาพโปรโมชัน")).not.toBeInTheDocument();
    expect(screen.queryByText("ภาพสินค้าทางการ")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ภาพสินค้า/ })).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("keeps the product overview close to the site header", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-24u421a-b" }),
      }),
    );

    const overviewSection = screen
      .getByRole("heading", { name: /จอมอนิเตอร์ FHD Curved ขนาด 24 นิ้ว พร้อม USB-C/, level: 1 })
      .closest("section");

    expect(overviewSection).toHaveClass("pt-6", "sm:pt-8", "lg:pt-10");
    expect(overviewSection).not.toHaveClass("section-space");
    expect(screen.getAllByTestId("product-view-count").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("product-view-count")[0]).toHaveTextContent("ผู้เข้าชม");
  });

  it("pins the model name to the right of the all-products back link under the site header", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-as10gdby0" }),
      }),
    );

    const backLink = screen.getByRole("link", { name: /สินค้าทั้งหมด/ });
    const productBar = backLink.closest("nav");
    const modelName = within(productBar!).getByText(
      "เครื่องฟอกอากาศ LG PuriCare 360 รุ่น AS10GDBY0 พร้อมฟังก์ชันสัตว์เลี้ยง",
    );

    expect(productBar).toHaveClass("sticky", "top-[76px]", "z-30");
    expect(productBar?.firstElementChild).toHaveClass("justify-between");
    expect(modelName).toHaveClass("truncate", "text-right");
    expect(backLink.compareDocumentPosition(modelName)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const galleryColumn = screen.getByText("Product overview").parentElement?.parentElement;
    expect(galleryColumn).toHaveClass("lg:sticky", "lg:top-[132px]");
  });

  it("keeps mobile dock clearance inside the footer instead of a white gap after main", () => {
    render(
      <PublicLayout>
        <div>เนื้อหาทดสอบ</div>
      </PublicLayout>,
    );

    expect(screen.getByRole("main")).not.toHaveClass("pb-36");
    expect(screen.getByRole("contentinfo")).toHaveClass("pb-28", "lg:pb-0");
  });
});
