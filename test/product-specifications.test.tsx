import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ProductDetailPage from "@/feature/public/products/components/product-detail-page";
import { allProducts } from "@/lib/catalog-products";
import { getProductSpecificationRecord, productSpecificationRecords } from "@/lib/product-specifications";

afterEach(cleanup);

describe("official LG product specifications", () => {
  it("accounts for every static product detail route without borrowing another model's data", () => {
    expect(allProducts).toHaveLength(51);
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
    expect(Object.values(productSpecificationRecords).every((record) => record.note === undefined)).toBe(true);
  });

  it("keeps catalog aliases tied to the exact official SKU used for technical data", () => {
    expect(getProductSpecificationRecord("S5G0C")?.sourceModel).toBe("S5GOC");
    expect(getProductSpecificationRecord("QNED86B")?.sourceModel).toBe("55QNED86BSA");
    expect(getProductSpecificationRecord("QNED80B")?.sourceModel).toBe("55QNED80BSA");
    expect(getProductSpecificationRecord("NU855B")?.sourceModel).toBe("55NU855BPSA");
    expect(getProductSpecificationRecord("StandbyME 2")?.sourceModel).toBe("27LX6TDGA");
    expect(getProductSpecificationRecord("32U889SA")?.sourceModel).toBe("32U889SA-W");
    expect(getProductSpecificationRecord("GRAB.ATHALBK")?.sourceModel).toBe("GRAB");
    expect(getProductSpecificationRecord("BOUNCE.ATHALBK")?.sourceModel).toBe("BOUNCE");
    expect(getProductSpecificationRecord("STAGE301.ATHALBK")?.sourceModel).toBe("STAGE301");
    expect(getProductSpecificationRecord("Stage 301")?.sourceModel).toBe("STAGE301");
  });

  it("publishes xboom specs from LG Thailand pages without mixing price-list carton or wattage shorthand", () => {
    const grab = getProductSpecificationRecord("GRAB");
    const bounce = getProductSpecificationRecord("BOUNCE");
    const stage = getProductSpecificationRecord("STAGE301");
    const grabProduct = allProducts.find((product) => product.model === "GRAB");
    const bounceProduct = allProducts.find((product) => product.model === "BOUNCE");
    const stageProduct = allProducts.find((product) => product.model === "STAGE301");

    expect(grabProduct?.monthlyPrice).toBe(109);
    expect(bounceProduct?.monthlyPrice).toBe(139);
    expect(stageProduct?.monthlyPrice).toBe(299);
    expect(grabProduct?.category).toBe("ลำโพง");
    expect(bounceProduct?.category).toBe("ลำโพง");
    expect(stageProduct?.category).toBe("ลำโพง");

    expect(grab?.groups[0]?.items).toEqual(
      expect.arrayContaining([
        { label: "กำลังขับ", value: "20 W + 10 W" },
        { label: "ขนาดลำโพง (กว้าง × สูง × ลึก)", value: "211.0 × 71.6 × 70.0 มม." },
        { label: "กันน้ำ / กันฝุ่น", value: "IP67" },
      ]),
    );
    expect(bounce?.groups[0]?.items).toEqual(
      expect.arrayContaining([
        { label: "กำลังขับ", value: "30 W + 5 W × 2" },
        { label: "ขนาดลำโพง (กว้าง × สูง × ลึก)", value: "272 × 103 × 88 มม." },
      ]),
    );
    expect(stage?.groups[0]?.items).toEqual(
      expect.arrayContaining([
        { label: "กำลังขับ", value: "120 W" },
        { label: "ขนาดลำโพง (กว้าง × สูง × ลึก)", value: "312 × 311 × 282 มม." },
        { label: "กันน้ำ", value: "IPX4" },
      ]),
    );

    const bounceValues = bounce?.groups.flatMap((group) => group.items.map((item) => item.value)).join(" ") ?? "";
    const stageValues = stage?.groups.flatMap((group) => group.items.map((item) => item.value)).join(" ") ?? "";
    expect(bounceValues).not.toMatch(/10 W Tweeter|30 W \+ 10 W/);
    expect(stageValues).not.toMatch(/352|415|385/);
    expect(grabProduct?.description).not.toMatch(/Bounce/);
    expect(stageProduct?.highlights.join(" ")).not.toMatch(/4K|webOS|HDMI 2\.1/);
  });

  it("does not present Portugal energy labels as Thailand specifications", () => {
    const portugalRecord = getProductSpecificationRecord("RC90V9AV2W");
    const labels = portugalRecord?.groups.flatMap((group) => group.items.map((item) => item.label)) ?? [];

    expect(portugalRecord?.sourceLocale).toBe("pt-PT");
    expect(labels).not.toContain("ระดับพลังงาน EU");
    expect(labels).not.toContain("การใช้พลังงาน");
    expect(portugalRecord?.note).toBeUndefined();
  });

  it("publishes a single WashTower wash capacity without LG conflict copy", () => {
    const washTowerRecord = getProductSpecificationRecord("WT1410NHEG");
    const washCapacity = washTowerRecord?.groups
      .flatMap((group) => group.items)
      .find((item) => item.label.includes("ความจุซัก"));

    expect(washCapacity).toEqual({ label: "ความจุซักสูงสุด", value: "14 กก." });
    expect(washTowerRecord?.note).toBeUndefined();
  });

  it("does not infer WD110AN traits while its model remains unresolved", () => {
    const unresolvedProduct = allProducts.find((product) => product.model === "WD110AN");

    expect(unresolvedProduct?.description).toMatch(/เครื่องกรองน้ำ LG PuriCare รุ่น WD110AN/);
    expect(unresolvedProduct?.description).not.toMatch(/ยืนยัน|ขัดกัน|น้ำอุณหภูมิห้อง|สีเบจ|กะทัดรัด/);
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
    expect(screen.queryByText(/คัดเฉพาะข้อมูลสำคัญ/)).not.toBeInTheDocument();
    expect(screen.queryByText("แหล่งข้อมูล")).not.toBeInTheDocument();
    expect(screen.queryByText("ตรวจสอบเมื่อ")).not.toBeInTheDocument();
    expect(screen.queryByText(/ตรวจสอบข้อมูลเมื่อ/)).not.toBeInTheDocument();

    const structuredData = JSON.parse(
      document.querySelector('script[type="application/ld+json"]')?.textContent ?? "[]",
    );
    expect(structuredData[0].additionalProperty.length).toBeGreaterThanOrEqual(4);
    expect(structuredData[0].additionalProperty[0]).toMatchObject({
      "@type": "PropertyValue",
    });
  });

  it("hides unresolved-model notices instead of showing guessed specifications", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-wd110an" }),
      }),
    );

    expect(screen.queryByRole("heading", { name: "กำลังตรวจสอบรหัสรุ่นนี้" })).not.toBeInTheDocument();
    expect(screen.queryByText(/ไม่นำสเปกของรุ่นใกล้เคียงมาแสดงแทน/)).not.toBeInTheDocument();
    expect(screen.queryByText(/หน้า LG มีข้อมูลขัดกัน/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "ข้อมูลจำเพาะของรุ่นนี้" })).not.toBeInTheDocument();
  });

  it("does not name a foreign LG site as the specification source", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-rc90v9av2w" }),
      }),
    );

    expect(screen.queryByText("LG Portugal")).not.toBeInTheDocument();
    expect(screen.queryByText("LG Hong Kong")).not.toBeInTheDocument();
    expect(screen.queryByText("แหล่งข้อมูล")).not.toBeInTheDocument();
  });

  it("does not show LG data-conflict notes on the WashTower page", async () => {
    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "lg-washtower-wt1410nheg" }),
      }),
    );

    expect(screen.queryByText(/หน้า LG มีข้อมูลขัดกัน/)).not.toBeInTheDocument();
    expect(screen.queryByText(/รอ LG ยืนยัน/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ตารางสเปก 12 กก/)).not.toBeInTheDocument();
    expect(screen.queryByText(/LG Hong Kong|LG Portugal|รหัสสเปก LG/)).not.toBeInTheDocument();
    expect(screen.getByText("14 กก.")).toBeVisible();
  });
});
