import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allProducts, catalogProducts } from "@/lib/catalog-products";
import {
  buildProductGallery,
  getPromotionImageSrc,
  promotionAssetMatchesModel,
} from "@/lib/promotion-images";
import { promotionImageAssets } from "@/lib/promotion-image-assets";

const matchingFixtures = [
  { sourceFolder: "SAQ13A", publicPath: "/images/products/promotions/aug-v3/saq13a__price-list-aug-v3.png" },
  {
    sourceFolder: "A9T-ULTRA.DCBPETH",
    publicPath: "/images/products/promotions/aug-v3/a9t-ultra-dcbpeth__price-list-aug-v3.png",
  },
  {
    sourceFolder: "WD516AN-WD518AN",
    publicPath: "/images/products/promotions/aug-v3/wd516an-wd518an__price-list-aug-v3.png",
  },
  {
    sourceFolder: "DD23GMWE1S.ATH",
    publicPath: "/images/products/promotions/aug-v3/dd23gmwe1s-ath__price-list-aug-v3.png",
  },
  {
    sourceFolder: "GC-X257CMEW.ATEPLMT",
    publicPath: "/images/products/promotions/aug-v3/gc-x257cmew-ateplmt__price-list-aug-v3.png",
  },
  {
    sourceFolder: "PTODFC553FV.APTO",
    publicPath: "/images/products/promotions/aug-v3/ptodfc553fv-apto__price-list-aug-v3.png",
  },
];

const catalogModelsWithPromotion = [
  "A9T-CORE",
  "A9T-LITE",
  "A9T-ULTRA",
  "AS10GDBY0",
  "AS25GCBY0",
  "AS60GHWG0",
  "AS65GDBY0",
  "DFC335HM",
  "F2520RNTB",
  "FV1413H4M",
  "G24FFQKB",
  "S3MFC",
  "SAQ13A",
  "TX2723ST5J",
  "WD110MN",
  "WD516AN",
  "WD518AN",
  "WT1410NHEG",
  "WT2116SHEG",
  "WT2520NHEG",
  "X257CMEW",
  "X257CMHW",
] as const;

describe("promotion still matching", () => {
  it("matches a catalog model to the exact source folder or SKU prefix", () => {
    expect(promotionAssetMatchesModel("SAQ13A", "SAQ13A")).toBe(true);
    expect(promotionAssetMatchesModel("A9T-ULTRA.DCBPETH", "A9T-ULTRA")).toBe(true);
    expect(getPromotionImageSrc("SAQ13A", matchingFixtures)).toBe(
      "/images/products/promotions/aug-v3/saq13a__price-list-aug-v3.png",
    );
    expect(getPromotionImageSrc("A9T-ULTRA", matchingFixtures)).toBe(
      "/images/products/promotions/aug-v3/a9t-ultra-dcbpeth__price-list-aug-v3.png",
    );
  });

  it("shares the WD516AN-WD518AN still between both water-purifier models", () => {
    expect(getPromotionImageSrc("WD516AN", matchingFixtures)).toBe(
      "/images/products/promotions/aug-v3/wd516an-wd518an__price-list-aug-v3.png",
    );
    expect(getPromotionImageSrc("WD518AN", matchingFixtures)).toBe(
      "/images/products/promotions/aug-v3/wd516an-wd518an__price-list-aug-v3.png",
    );
  });

  it("treats a refrigerator SKU with a GC- prefix as the same catalog model", () => {
    expect(getPromotionImageSrc("X257CMEW", matchingFixtures)).toBe(
      "/images/products/promotions/aug-v3/gc-x257cmew-ateplmt__price-list-aug-v3.png",
    );
  });

  it("does not attach a nearby or longer SKU as if it were the same model", () => {
    expect(getPromotionImageSrc("DD23GMWE1", matchingFixtures)).toBeUndefined();
    expect(getPromotionImageSrc("DFC533FV", matchingFixtures)).toBeUndefined();
    expect(promotionAssetMatchesModel("QNED86B", "55QNED86BSA")).toBe(false);
    expect(promotionAssetMatchesModel("WD516AN-WD518AN", "WD110AN")).toBe(false);
  });
});

describe("product gallery promotion stills", () => {
  it("places the promotion still first and keeps the official photos after it", () => {
    const gallery = buildProductGallery({
      name: "เครื่องกรองน้ำ LG PuriCare รุ่น WD516",
      image: "/images/products/lg-catalog/wd516an.jpg",
      promotionImage: "/images/products/promotions/aug-v3/wd516an-wd518an__price-list-aug-v3.png",
      gallery: [
        {
          src: "/images/products/lg-catalog/wd516an.jpg",
          alt: "ภาพสินค้า เครื่องกรองน้ำ LG PuriCare รุ่น WD516",
          kind: "official",
        },
        {
          src: "/images/products/official/wt1410nheg/01-front.jpeg",
          alt: "ภาพเพิ่มเติม",
          kind: "official",
        },
      ],
    });

    expect(gallery.map((image) => image.src)).toEqual([
      "/images/products/promotions/aug-v3/wd516an-wd518an__price-list-aug-v3.png",
      "/images/products/lg-catalog/wd516an.jpg",
      "/images/products/official/wt1410nheg/01-front.jpeg",
    ]);
    expect(gallery[0]).toMatchObject({ kind: "promotion" });
  });

  it("does not insert the same promotion still twice", () => {
    const promotionSrc = "/images/products/promotions/aug-v3/saq13a__price-list-aug-v3.png";
    const gallery = buildProductGallery({
      name: "แอร์ SAQ13A",
      image: "/images/products/lg-catalog/saq13a.jpg",
      promotionImage: promotionSrc,
      gallery: [
        { src: promotionSrc, alt: "ภาพโปรโมชัน แอร์ SAQ13A", kind: "promotion" },
        {
          src: "/images/products/lg-catalog/saq13a.jpg",
          alt: "ภาพสินค้า แอร์ SAQ13A",
          kind: "official",
        },
      ],
    });

    expect(gallery.filter((image) => image.src === promotionSrc)).toHaveLength(1);
    expect(gallery[0]?.src).toBe(promotionSrc);
  });
});

describe("synced catalog promotion stills", () => {
  it("exposes a public promotion still only for exact catalog matches", () => {
    const matched = catalogProducts.filter((product) => product.promotionImage);
    expect(matched.map((product) => product.model).sort()).toEqual([...catalogModelsWithPromotion]);

    const airWithoutStill = catalogProducts.find((product) => product.model === "SEQ13A");
    const dehumidifier = catalogProducts.find((product) => product.model === "DD23GMWE1");
    const monitor = catalogProducts.find((product) => product.model === "24U421A-B");

    expect(airWithoutStill?.promotionImage).toBeUndefined();
    expect(dehumidifier?.promotionImage).toBeUndefined();
    expect(monitor?.promotionImage).toBeUndefined();
    expect(airWithoutStill?.image).toBe("/images/products/lg-catalog/seq13a.jpg");
  });

  it("keeps promotion stills on public paths that exist on disk", () => {
    expect(promotionImageAssets.length).toBeGreaterThan(0);

    for (const product of allProducts) {
      const sources = [
        product.image,
        product.promotionImage,
        ...(product.gallery ?? []).map((image) => image.src),
      ].filter((src): src is string => Boolean(src));

      for (const src of sources) {
        expect(src.startsWith("/images/")).toBe(true);
        expect(src).not.toMatch(/\.gen/);
        expect(src).not.toMatch(/rejected-layout/);
        expect(src).not.toMatch(/pre-hanging-tag/);
        expect(src).not.toMatch(/\/tmp\//);
        expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
      }

      if (product.promotionImage) {
        expect(product.gallery?.[0]?.src).toBe(product.promotionImage);
        expect(product.gallery?.slice(1).length).toBeGreaterThan(0);
        expect(new Set(product.gallery?.map((image) => image.src)).size).toBe(product.gallery?.length);
      }
    }

    const washTower = catalogProducts.find((product) => product.model === "WT1410NHEG");
    expect(washTower?.gallery).toHaveLength(17);
    expect(washTower?.gallery?.[0]?.kind).toBe("promotion");
    expect(washTower?.gallery?.filter((image) => image.kind === "official")).toHaveLength(15);
  });
});
