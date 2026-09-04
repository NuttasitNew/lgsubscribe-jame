import { promotionImageAssets, type PromotionImageAsset } from "@/lib/promotion-image-assets";
import type { Product, ProductGalleryImage } from "@/lib/site";

export const PROMOTION_CAMPAIGN = "sep-v4";
export const PROMOTION_SOURCE_DIRNAME = "Price list_Sep_V4";
export const PROMOTION_PUBLIC_DIR = `/images/products/promotions/${PROMOTION_CAMPAIGN}`;

const COMBINED_FOLDER_MODELS: Record<string, readonly string[]> = {
  "WD516AN-WD518AN": ["WD516AN", "WD518AN"],
};

const SOURCE_FOLDER_MODEL_ALIASES: Record<string, readonly string[]> = {
  "55QNED80BSA.ATM": ["QNED80B"],
  "32U889SA-W.ATM": ["32U889SA"],
};

export function promotionAssetMatchesModel(sourceFolder: string, model: string): boolean {
  const combinedModels = COMBINED_FOLDER_MODELS[sourceFolder];
  if (combinedModels) return combinedModels.includes(model);
  const aliases = SOURCE_FOLDER_MODEL_ALIASES[sourceFolder];
  if (aliases) return aliases.includes(model);
  if (sourceFolder === model) return true;

  const dotIndex = sourceFolder.indexOf(".");
  const skuBase = dotIndex === -1 ? sourceFolder : sourceFolder.slice(0, dotIndex);
  return skuBase === model || skuBase === `GC-${model}`;
}

export function getPromotionImageSrc(
  model: string,
  assets: readonly PromotionImageAsset[] = promotionImageAssets,
): string | undefined {
  return assets.find((asset) => promotionAssetMatchesModel(asset.sourceFolder, model))?.publicPath;
}

export function buildProductGallery(
  product: Pick<Product, "name" | "image" | "gallery" | "promotionImage">,
): ProductGalleryImage[] {
  const existing = product.gallery ?? [
    { src: product.image, alt: `ภาพสินค้า ${product.name}`, kind: "official" as const },
  ];

  if (!product.promotionImage) return existing;

  const withoutDuplicate = existing.filter((image) => image.src !== product.promotionImage);
  return [
    {
      src: product.promotionImage,
      alt: `ภาพโปรโมชัน ${product.name}`,
      kind: "promotion",
    },
    ...withoutDuplicate,
  ];
}

export function attachPromotionImage(product: Product): Product {
  const promotionImage = getPromotionImageSrc(product.model);
  if (!promotionImage) return product;

  const nextProduct = { ...product, promotionImage };
  return {
    ...nextProduct,
    gallery: buildProductGallery(nextProduct),
  };
}
