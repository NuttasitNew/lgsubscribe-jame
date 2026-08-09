import type { Metadata } from "next";
import ProductDetailPage, {
  generateMetadata as createProductMetadata,
  generateStaticParams as createProductParams,
} from "@/feature/public/products/components/product-detail-page";

type ProductPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return createProductParams();
}

export async function generateMetadata(props: ProductPageProps): Promise<Metadata> {
  return createProductMetadata(props);
}

export default ProductDetailPage;
