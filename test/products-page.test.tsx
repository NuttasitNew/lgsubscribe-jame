import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductsPage from "@/feature/public/products/components/products-page";
import { allProducts, catalogProducts } from "@/lib/catalog-products";
import { knowledgeInventory, productKnowledgeGuides } from "@/lib/product-knowledge";

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/products/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => navigation.searchParams,
}));

async function chooseCategory(optionName: string | RegExp) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "กรองตามหมวดสินค้า" }));
  await user.click(screen.getByRole("option", { name: optionName }));
}

beforeEach(() => {
  navigation.searchParams = new URLSearchParams();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProductsPage knowledge visibility", () => {
  it("renders every extracted model as a visible catalog card", () => {
    render(<ProductsPage />);

    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(knowledgeInventory.modelCount);
    expect(screen.getAllByText("AS10GDBY0")[0]).toBeVisible();
    expect(screen.getAllByText("32U889SA")[0]).toBeVisible();

    const itemListJson = document.querySelector('script[type="application/ld+json"]')?.textContent;
    expect(itemListJson).toBeTruthy();
    expect(JSON.parse(itemListJson ?? "{}").itemListElement).toHaveLength(knowledgeInventory.modelCount);
  });

  it("renders the catalog models as real product cards with local artwork and detail links", () => {
    render(<ProductsPage />);

    expect(catalogProducts).toHaveLength(knowledgeInventory.modelCount);
    expect(
      screen.queryByRole("heading", { name: `สินค้า LG ทั้ง ${knowledgeInventory.modelCount} รุ่น` }),
    ).not.toBeInTheDocument();

    const cards = screen.getAllByTestId("catalog-model-card");
    for (const [index, card] of cards.entries()) {
      const product = catalogProducts[index];
      const cardImage = product.promotionImage ?? product.image;
      expect(decodeURIComponent(within(card).getByRole("img").getAttribute("src") ?? "")).toContain(
        cardImage,
      );
      expect(product.image).toMatch(/^\/images\/products\/lg-catalog\//);
      if (product.promotionImage) {
        expect(product.promotionImage).toMatch(/^\/images\/products\/promotions\//);
      }
      expect(within(card).getByRole("link", { name: "ดูรายละเอียด" })).toHaveAttribute(
        "href",
        `/products/${product.slug}`,
      );
      expect(within(card).getByRole("img")).toHaveClass("object-contain");
      expect(within(card).getByRole("img").closest("[data-image-slot=image]")).toHaveClass("aspect-square");
      expect(card).toHaveClass("h-full");
      expect(card.firstChild).not.toHaveClass("max-sm:grid");
    }
  });

  it("keeps every official product image inside the project", () => {
    const sources = readFileSync(join(process.cwd(), "public/images/products/lg-catalog/SOURCES.md"), "utf8");

    for (const product of catalogProducts) {
      expect(product.image).toMatch(/^\/images\/products\/lg-catalog\//);
      expect(product.image).not.toMatch(/https?:\/\/www\.lg\.com\//);
      expect(product.imageSource).toMatch(/^https:\/\/www\.lg\.com\//);
      expect(existsSync(join(process.cwd(), "public", product.image))).toBe(true);
      expect(sources).toContain(`\`${product.image.split("/").at(-1)}\``);
    }

    for (const product of allProducts) {
      expect(product.image.startsWith("/images/")).toBe(true);
      expect(product.image).not.toMatch(/^https?:\/\//);
      expect(existsSync(join(process.cwd(), "public", product.image))).toBe(true);
    }
  });

  it("publishes only one detail route for each model code", () => {
    expect(new Set(allProducts.map((product) => product.model)).size).toBe(allProducts.length);
  });

  it("keeps the desktop finder while the mobile dock owns search on small screens", () => {
    render(<ProductsPage />);

    expect(
      screen.getByRole("heading", { name: "สินค้าเครื่องใช้ไฟฟ้า LG แบบรายเดือน", level: 1 }),
    ).toHaveClass("sr-only");
    expect(screen.queryByRole("link", { name: /ดูสินค้าทั้ง 47 รุ่น/ })).not.toBeInTheDocument();
    expect(screen.queryByText("พบ 47 รุ่น")).not.toBeInTheDocument();

    expect(screen.getByTestId("category-filter")).toHaveTextContent(
      `ทั้งหมด (${knowledgeInventory.modelCount})`,
    );

    const catalogRegion = screen.getByRole("region", { name: "รายการสินค้าจากเอกสาร" });
    expect(catalogRegion).toHaveAttribute("id", "product-knowledge");
    expect(document.querySelector("#catalog-search")).toHaveClass(
      "hidden",
      "lg:block",
      "sticky",
      "top-[76px]",
    );
    expect(within(catalogRegion).getAllByTestId("catalog-model-card")).toHaveLength(
      knowledgeInventory.modelCount,
    );
    expect(screen.queryByText("Product knowledge library")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ดูเพิ่มอีก/ })).not.toBeInTheDocument();
  });

  it("filters the catalog by category and model code", async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);

    await user.click(screen.getByRole("combobox", { name: "กรองตามหมวดสินค้า" }));
    expect(screen.getAllByRole("option")).toHaveLength(productKnowledgeGuides.length + 1);
    await user.click(screen.getByRole("option", { name: /เครื่องฟอกอากาศ/ }));

    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "เครื่องฟอกอากาศ", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("หมวด 02")).toBeVisible();
    expect(screen.getByRole("link", { name: "ดูสินค้าทั้งหมด →" })).toHaveAttribute("href", "/products");
    expect(screen.queryByText("SAQ13A")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" }), {
      target: { value: "AS60GHWG0" },
    });
    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(1);
    expect(screen.getAllByText("AS60GHWG0")[0]).toBeVisible();
  });

  it("does not show LG source-conflict notes on the catalog", () => {
    render(<ProductsPage />);

    expect(screen.queryByText(/หน้า LG มีข้อมูลขัดกัน/)).not.toBeInTheDocument();
    expect(screen.queryByText(/อยู่ระหว่างยืนยันรหัสรุ่นกับ LG/)).not.toBeInTheDocument();
    expect(screen.queryByText(/รอ LG ยืนยัน/)).not.toBeInTheDocument();
    expect(screen.queryByText(/รหัสสินค้าที่เกี่ยวข้อง/)).not.toBeInTheDocument();
    expect(screen.queryByText(/LG Hong Kong|LG Portugal/)).not.toBeInTheDocument();
  });

  it("scrolls back to the top after searching or changing category", async () => {
    render(<ProductsPage />);
    expect(window.scrollTo).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("searchbox", { name: "ค้นหาสินค้า LG" }), {
      target: { value: "AS60GHWG0" },
    });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });

    vi.mocked(window.scrollTo).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });

    vi.mocked(window.scrollTo).mockClear();
    await chooseCategory(/เครื่องฟอกอากาศ/);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "smooth" });
  });

  it("keeps category headings sticky while browsing the catalog", () => {
    render(<ProductsPage />);

    const heading = screen.getByRole("heading", { name: "เครื่องปรับอากาศ", level: 2 });
    const header = heading.closest("[data-testid=catalog-category-header]");
    expect(header).toHaveClass("sticky", "top-[76px]", "z-20", "lg:top-[calc(76px+6rem)]");
    expect(header?.querySelector(".container-page")).not.toBeNull();
    expect(header?.parentElement?.closest(".container-page")).toBeNull();
    expect(screen.queryByRole("link", { name: "ดูสินค้าทั้งหมด →" })).not.toBeInTheDocument();
  });

  it("keeps product visitor counts under sticky category headings", () => {
    render(<ProductsPage />);

    const header = screen.getAllByTestId("catalog-category-header")[0];
    const viewCount = screen.getAllByTestId("product-card-view-count")[0];
    const card = viewCount.closest("[data-slot=card]");

    expect(header).toHaveClass("z-20");
    expect(card).toHaveClass("isolate");
    expect(viewCount.closest(".relative.z-0")).not.toBeNull();
  });

  it("opens a category from the URL as a filtered catalog", () => {
    navigation.searchParams = new URLSearchParams("category=เครื่องฟอกอากาศ");
    render(<ProductsPage />);

    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "เครื่องฟอกอากาศ", level: 2 })).toBeVisible();
    expect(screen.getByText("หมวด 02")).toBeVisible();
    expect(screen.getByText("4 รุ่น")).toBeVisible();
    expect(screen.getByRole("link", { name: "ดูสินค้าทั้งหมด →" })).toHaveAttribute("href", "/products");
    expect(screen.queryByRole("heading", { name: "ตู้เย็น", level: 2 })).not.toBeInTheDocument();
  });

  it("returns to the full catalog from the category heading", async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);
    await chooseCategory(/เครื่องฟอกอากาศ/);

    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(4);

    await user.click(screen.getByRole("link", { name: "ดูสินค้าทั้งหมด →" }));

    expect(screen.getAllByTestId("catalog-model-card")).toHaveLength(knowledgeInventory.modelCount);
    expect(screen.queryByRole("link", { name: "ดูสินค้าทั้งหมด →" })).not.toBeInTheDocument();
  });
});
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
