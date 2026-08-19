import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ProductDetailPage from "@/feature/public/products/components/product-detail-page";
import { allProducts } from "@/lib/catalog-products";
import { getProductSpecificationRecord, productSpecificationRecords } from "@/lib/product-specifications";

afterEach(cleanup);

describe("official LG product specifications", () => {
  it("accounts for every static product detail route without borrowing another model's data", () => {
    expect(allProducts).toHaveLength(48);
    expect(Object.keys(productSpecificationRecords)).toHaveLength(allProducts.length);

    for (const product of allProducts) {
      const record = getProductSpecificationRecord(product.model);
      expect(record, product.model).toBeDefined();
      expect(record?.sourceUrl, product.model).toMatch(/^https:\/\/www\.lg\.com\//);
      expect(record?.verifiedAt, product.model).toBe("2026-08-12");

      if (record?.status === "verified") {
        expect(record.groups.flatMap((group) => group.items).length, product.model).toBeGreaterThanOrEqual(4);
      }
    }

    const unverifiedModels = allProducts
      .filter((product) => getProductSpecificationRecord(product.model)?.status === "unverified")
      .map((product) => product.model);
    expect(unverifiedModels).toEqual(["WD110AN"]);
    expect(getProductSpecificationRecord("WD110AN")?.groups).toEqual([]);
  });

  it("keeps catalog aliases tied to the exact official SKU used for technical data", () => {
    expect(getProductSpecificationRecord("S5G0C")?.sourceModel).toBe("S5GOC");
    expect(getProductSpecificationRecord("QNED86B")?.sourceModel).toBe("55QNED86BSA");
    expect(getProductSpecificationRecord("QNED80B")?.sourceModel).toBe("55QNED80BSA");
    expect(getProductSpecificationRecord("NU855B")?.sourceModel).toBe("55NU855BPSA");
    expect(getProductSpecificationRecord("StandbyME 2")?.sourceModel).toBe("27LX6TDGA");
    expect(getProductSpecificationRecord("32U889SA")?.sourceModel).toBe("32U889SA-W");
  });

  it("does not present Portugal energy labels as Thailand specifications", () => {
    const portugalRecord = getProductSpecificationRecord("RC90V9AV2W");
    const labels = portugalRecord?.groups.flatMap((group) => group.items.map((item) => item.label)) ?? [];

    expect(portugalRecord?.sourceLocale).toBe("pt-PT");
    expect(labels).not.toContain("ระดับพลังงาน EU");
    expect(labels).not.toContain("การใช้พลังงาน");
    expect(portugalRecord?.note).toMatch(/ไม่แสดงฉลากพลังงาน EU/);
  });

  it("shows both conflicting WT1410 capacities without choosing one for LG", () => {
    const washTowerRecord = getProductSpecificationRecord("WT1410NHEG");
    const washCapacity = washTowerRecord?.groups
      .flatMap((group) => group.items)
      .find((item) => item.label.includes("ความจุซัก"));

    expect(washCapacity?.value).toContain("ชื่อสินค้า 14 กก.");
    expect(washCapacity?.value).toContain("ตารางสเปก 12 กก.");
    expect(washCapacity?.value).toContain("รอ LG ยืนยัน");
  });

  it("does not infer WD110AN traits while its model remains unresolved", () => {
    const unresolvedProduct = allProducts.find((product) => product.model === "WD110AN");

    expect(unresolvedProduct?.description).toMatch(/รายละเอียดทางเทคนิคอยู่ระหว่างยืนยัน/);
    expect(unresolvedProduct?.description).not.toMatch(/น้ำอุณหภูมิห้อง|สีเบจ|กะทัดรัด/);
  });

  it("renders grouped technical data and exposes it in Product structured data", async () => {
    const record = getProductSpecificationRecord("34WR50QK-B");
    expect(record?.status).toBe("verified");
    const firstSpecification = record?.groups[0]?.items[0];
    expect(firstSpecification).toBeDefined();

    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-34wr50qk-b" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "ข้อมูลจำเพาะของรุ่นนี้", level: 2 })).toBeVisible();
    expect(screen.getByText(firstSpecification?.value ?? "__missing__")).toBeVisible();

    const structuredData = JSON.parse(
      document.querySelector('script[type="application/ld+json"]')?.textContent ?? "[]",
    );
    expect(structuredData[0].additionalProperty.length).toBeGreaterThanOrEqual(4);
    expect(structuredData[0].additionalProperty[0]).toMatchObject({
      "@type": "PropertyValue",
    });
  });

  it("shows a model-verification notice instead of guessed specifications", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-wd110an" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "กำลังตรวจสอบรหัสรุ่นนี้", level: 2 })).toBeVisible();
    expect(screen.getByText(/ไม่นำสเปกของรุ่นใกล้เคียงมาแสดงแทน/)).toBeVisible();
  });
});
