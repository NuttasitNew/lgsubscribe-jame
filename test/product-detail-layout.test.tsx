import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLayout from "@/app/(public)/layout";
import ProductDetailPage from "@/feature/public/products/components/product-detail-page";

const navigation = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products/lg-siq11b/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => navigation.searchParams,
}));

afterEach(() => {
  cleanup();
  navigation.searchParams = new URLSearchParams();
});

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

  it("keeps the official packshot after the promotion still for every September model", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-siq11b" }),
      }),
    );

    expect(screen.queryByText("ภาพโปรโมชัน")).not.toBeInTheDocument();
    expect(screen.queryByText("ภาพสินค้าทางการ")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ภาพโปรโมชัน/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ภาพสินค้า/ })).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("keeps the product overview close to the site header", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-siq11b" }),
      }),
    );

    const overviewSection = screen
      .getByRole("heading", { name: /แอร์อินเวอร์เตอร์ 9,212 BTU LG DUALCOOL AI Air รุ่น SIQ11B/, level: 1 })
      .closest("section");

    expect(overviewSection).toHaveClass("pt-6", "sm:pt-8", "lg:pt-10");
    expect(overviewSection).not.toHaveClass("section-space");
    expect(screen.getByTestId("product-view-count")).toHaveTextContent("ผู้เข้าชม");
    expect(screen.getByTestId("product-view-count").parentElement).toHaveClass("left-3", "top-3", "z-20");
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

  it("returns to the same search and category from a product detail page", async () => {
    navigation.searchParams = new URLSearchParams("q=WT1410NHEG&category=เครื่องซักและอบผ้า");
    render(await ProductDetailPage({ params: Promise.resolve({ slug: "lg-washtower-wt1410nheg" }) }));

    const backHref = screen.getByRole("link", { name: /สินค้าทั้งหมด/ }).getAttribute("href");
    const backUrl = new URL(backHref ?? "", "http://localhost");
    expect(backUrl.pathname).toBe("/products");
    expect(backUrl.searchParams.get("q")).toBe("WT1410NHEG");
    expect(backUrl.searchParams.get("category")).toBe("เครื่องซักและอบผ้า");
  });

  it("shows only the verified WT1410NHEG review album on that model", async () => {
    render(await ProductDetailPage({ params: Promise.resolve({ slug: "lg-washtower-wt1410nheg" }) }));

    const reviews = screen.getByRole("heading", { name: "WashTower", level: 2 }).closest("section");
    expect(within(reviews!).getAllByRole("img")).toHaveLength(4);
    expect(within(reviews!).getAllByRole("img")[0]).toHaveAttribute(
      "alt",
      "LG WashTower WT1410NHEG ก่อนติดตั้งในบ้านลูกค้า",
    );
    expect(within(reviews!).queryByRole("button", { name: "ดูรีวิวเพิ่มเติม" })).not.toBeInTheDocument();

    cleanup();
    render(await ProductDetailPage({ params: Promise.resolve({ slug: "lg-wt2116sheg" }) }));
    expect(screen.queryByRole("heading", { name: "WashTower", level: 2 })).not.toBeInTheDocument();
  });

  it("does not show generated customer reviews on a product page", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-as10gdby0" }),
      }),
    );

    const overview = screen.getByRole("heading", {
      name: /เครื่องฟอกอากาศ LG PuriCare 360 รุ่น AS10GDBY0/,
      level: 1,
    });
    const specifications = screen.getByRole("heading", { name: "ข้อมูลจำเพาะของรุ่นนี้", level: 2 });

    expect(screen.queryByRole("heading", { name: "รีวิวจากคนใช้รุ่นนี้", level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByText("จากผู้ใช้งานจริง")).not.toBeInTheDocument();
    expect(overview.compareDocumentPosition(specifications)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("keeps mobile dock clearance inside the footer instead of a white gap after main", () => {
    render(
      <PublicLayout>
        <div>เนื้อหาทดสอบ</div>
      </PublicLayout>,
    );

    expect(screen.getByRole("main")).not.toHaveClass("pb-36");
    expect(screen.getByRole("contentinfo")).toHaveClass("pb-28", "lg:pb-0");
    expect(within(screen.getByRole("contentinfo")).getByTestId("site-view-count")).toHaveTextContent(
      "ผู้เข้าชมเว็บไซต์",
    );
  });
});
